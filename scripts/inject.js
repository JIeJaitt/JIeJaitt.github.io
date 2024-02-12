hexo.extend.injector.register('head_end', () => `
   <style>
      /* 置顶导航栏样式 */
      .navbar {
         z-index: 100;
         position: sticky;
         top: 0;
      }
   </style>
`);