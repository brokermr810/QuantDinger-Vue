/**
 * 项目默认配置项
 * primaryColor - 默认主题色, 如果修改颜色不生效，请清理 localStorage
 * navTheme - sidebar theme ['dark', 'light'] 两种主题
 * colorWeak - 色盲模式
 * layout - 整体布局方式 ['sidemenu', 'topmenu'] 两种布局
 * fixedHeader - 固定 Header : boolean
 * fixSiderbar - 固定左侧菜单栏 ： boolean
 * contentWidth - 内容区布局： 流式 |  固定
 *
 * storageOptions: {} - Vue-ls 插件配置项 (localStorage/sessionStorage)
 *
 */

export const PYTHON_API_BASE_URL = process.env.VUE_APP_PYTHON_API_BASE_URL || 'http://localhost:5000'

export default {
  /** Web UI release label (footer, docs cross-reference). */
  appVersion: '3.0.2',
  navTheme: 'light', // theme for nav menu
  primaryColor: '#13C2C2', // '#F5222D', // primary color of ant design
  layout: 'sidemenu', // nav menu position: `sidemenu` or `topmenu`
  contentWidth: 'Fluid', // layout of content: `Fluid` or `Fixed`, only works when layout is topmenu
  fixedHeader: true, // sticky header - 固定顶部导航栏
  fixSiderbar: true, // sticky siderbar - 固定左侧边栏
  colorWeak: false,
  menu: {
    locale: true
  },
  title: 'QuantDinger',
  pwa: false,
  iconfontUrl: '',
  production: process.env.NODE_ENV === 'production' && process.env.VUE_APP_PREVIEW !== 'true'

}
