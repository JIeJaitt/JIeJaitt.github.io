// const css = hexo.extend.helper.get('css').bind(hexo);
// const js = hexo.extend.helper.get('js').bind(hexo);

// hexo.extend.injector.register('head_end', () => {
// 	return css('/css/navbar.css');
//   });

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