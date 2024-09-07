---
title: >-
  openWakeWord:An open-source audio wake word (or phrase) detection framework
  with a focus on performance and simplicity
excerpt: 本博客暂不显示摘要，请大家谅解
abbrlink: 56e1444a
toc: true
date: 2022-05-30 09:49:38
categories: 人工智能
tags:
sticky:
---

## 前言

这个项目主要是用来实现语音唤醒及其模型训练的，我试着阅读阅读一下他的源码来理解大致的语音唤醒的步骤

An open-source audio wake word (or phrase) detection framework with a focus on performance and simplicity

## 全文架构纵览

```py
def __init__(self, n_classes=1, input_shape=(16, 96), model_type="dnn",
                 layer_dim=128, n_blocks=1, seconds_per_example=None):
def save_model(self, output_path):
def export_to_onnx(self, output_path, class_mapping=""):
    
def lr_warmup_cosine_decay(self,
                            global_step,
                            warmup_steps=0,
                            hold=0,
                            total_steps=0,
                            start_lr=0.0,
                            target_lr=1e-3
                            ):

def forward(self, x):                           
def summary(self):  
def average_models(self, models=None):
def _select_best_model(self, false_positive_validate_data, val_set_hrs=11.3, max_fp_per_hour=0.5, min_recall=0.20):

def auto_train(self, X_train, X_val, false_positive_val_data, steps=50000, max_negative_weight=1000,
            target_fp_per_hour=0.2):

def predict_on_features(self, features, model=None):
def predict_on_clips(self, clips, model=None):
def export_model(self, model, model_name, output_dir):

                            def train_model(self, X, max_steps, warmup_steps, hold_steps, X_val=None,
                    false_positive_val_data=None, positive_test_clips=None,
                    negative_weight_schedule=[1],
                    val_steps=[250], lr=0.0001, val_set_hrs=1):            
```

## 自动训练

这段代码主要用来处理模型自动训练的流程。



```py
    def auto_train(self, X_train, X_val, false_positive_val_data, steps=50000, max_negative_weight=1000,
                   target_fp_per_hour=0.2):
        """A sequence of training steps that produce relatively strong models
        automatically, based on validation data and performance targets provided.
        After training merges the best checkpoints and returns a single model.
        """

        # Get false positive validation data duration
        val_set_hrs = 11.3

        # Sequence 1
        logging.info("#"*50 + "\nStarting training sequence 1...\n" + "#"*50)
        lr = 0.0001
        weights = np.linspace(1, max_negative_weight, int(steps)).tolist()
        val_steps = np.linspace(steps-int(steps*0.25), steps, 20).astype(np.int64)
        self.train_model(
                    X=X_train,
                    X_val=X_val,
                    false_positive_val_data=false_positive_val_data,
                    max_steps=steps,
                    negative_weight_schedule=weights,
                    val_steps=val_steps, warmup_steps=steps//5,
                    hold_steps=steps//3, lr=lr, val_set_hrs=val_set_hrs)

        # Sequence 2
        logging.info("#"*50 + "\nStarting training sequence 2...\n" + "#"*50)
        lr = lr/10
        steps = steps/10

        # Adjust weights as needed based on false positive per hour performance from first sequence
        if self.best_val_fp > target_fp_per_hour:
            max_negative_weight = max_negative_weight*2
            logging.info("Increasing weight on negative examples to reduce false positives...")

        weights = np.linspace(1, max_negative_weight, int(steps)).tolist()
        val_steps = np.linspace(1, steps, 20).astype(np.int16)
        self.train_model(
                    X=X_train,
                    X_val=X_val,
                    false_positive_val_data=false_positive_val_data,
                    max_steps=steps,
                    negative_weight_schedule=weights,
                    val_steps=val_steps, warmup_steps=steps//5,
                    hold_steps=steps//3, lr=lr, val_set_hrs=val_set_hrs)

        # Sequence 3
        logging.info("#"*50 + "\nStarting training sequence 3...\n" + "#"*50)
        lr = lr/10

        # Adjust weights as needed based on false positive per hour performance from second sequence
        if self.best_val_fp > target_fp_per_hour:
            max_negative_weight = max_negative_weight*2
            logging.info("Increasing weight on negative examples to reduce false positives...")

        weights = np.linspace(1, max_negative_weight, int(steps)).tolist()
        val_steps = np.linspace(1, steps, 20).astype(np.int16)
        self.train_model(
                    X=X_train,
                    X_val=X_val,
                    false_positive_val_data=false_positive_val_data,
                    max_steps=steps,
                    negative_weight_schedule=weights,
                    val_steps=val_steps, warmup_steps=steps//5,
                    hold_steps=steps//3, lr=lr, val_set_hrs=val_set_hrs)

        # Merge best models
        logging.info("Merging checkpoints above the 90th percentile into single model...")
        accuracy_percentile = np.percentile(self.history["val_accuracy"], 90)
        recall_percentile = np.percentile(self.history["val_recall"], 90)
        fp_percentile = np.percentile(self.history["val_fp_per_hr"], 10)

        # Get models above the 90th percentile
        models = []
        for model, score in zip(self.best_models, self.best_model_scores):
            if score["val_accuracy"] >= accuracy_percentile and \
                    score["val_recall"] >= recall_percentile and \
                    score["val_fp_per_hr"] <= fp_percentile:
                models.append(model)

        if len(models) > 0:
            combined_model = self.average_models(models=models)
        else:
            combined_model = self.model

        # Report validation metrics for combined model
        with torch.no_grad():
            for batch in X_val:
                x, y = batch[0].to(self.device), batch[1].to(self.device)
                val_ps = combined_model(x)

            combined_model_recall = self.recall(val_ps, y[..., None]).detach().cpu().numpy()
            combined_model_accuracy = self.accuracy(val_ps, y[..., None].to(torch.int64)).detach().cpu().numpy()

            combined_model_fp = 0
            for batch in false_positive_val_data:
                x_val, y_val = batch[0].to(self.device), batch[1].to(self.device)
                val_ps = combined_model(x_val)
                combined_model_fp += self.fp(val_ps, y_val[..., None])

            combined_model_fp_per_hr = (combined_model_fp/val_set_hrs).detach().cpu().numpy()

        logging.info(f"\n################\nFinal Model Accuracy: {combined_model_accuracy}"
                     f"\nFinal Model Recall: {combined_model_recall}\nFinal Model False Positives per Hour: {combined_model_fp_per_hr}"
                     "\n################\n")

        return combined_model
```