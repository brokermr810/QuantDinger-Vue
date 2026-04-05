// eslint-disable-next-line
import { UserLayout, BasicLayout, BlankLayout } from '@/layouts'

export const asyncRouterMap = [
  {
    path: '/',
    name: 'index',
    component: BasicLayout,
    meta: { title: 'menu.home' },
    redirect: '/ai-asset-analysis',
    children: [
      // 1. AI资产分析（首页）
      {
        path: '/ai-asset-analysis',
        name: 'AIAssetAnalysis',
        component: () => import('@/views/ai-asset-analysis'),
        meta: { title: 'menu.dashboard.aiAssetAnalysis', keepAlive: false, icon: 'appstore', permission: ['dashboard'] }
      },
      // 2. 指标分析
      {
        path: '/indicator-analysis',
        name: 'Indicator',
        component: () => import('@/views/indicator-analysis'),
        meta: { title: 'menu.dashboard.indicator', keepAlive: true, icon: 'line-chart', permission: ['dashboard'] }
      },
      // 3. 回测中心
      {
        path: '/backtest-center',
        name: 'BacktestCenter',
        component: () => import('@/views/backtest-center'),
        meta: { title: 'menu.dashboard.backtestCenter', keepAlive: false, icon: 'experiment', permission: ['dashboard'] }
      },
      // 4. 交易助手（含实盘概览 = 原仪表盘）
      {
        path: '/trading-assistant',
        name: 'TradingAssistant',
        component: () => import('@/views/trading-assistant'),
        meta: { title: 'menu.dashboard.tradingAssistant', keepAlive: true, icon: 'robot', permission: ['dashboard'] }
      },
      // 5. 指标市场
      {
        path: '/indicator-community',
        name: 'IndicatorCommunity',
        component: () => import('@/views/indicator-community'),
        meta: { title: 'menu.dashboard.community', keepAlive: false, icon: 'shop', permission: ['dashboard'] }
      },
      // 原仪表盘路由保留兼容，重定向到交易助手
      {
        path: '/dashboard',
        name: 'Dashboard',
        redirect: '/trading-assistant?tab=overview',
        hidden: true,
        meta: { title: 'menu.dashboard', keepAlive: false, icon: 'dashboard', permission: ['dashboard'] }
      },
      // AI 分析（隐藏）
      {
        path: '/ai-analysis/:pageNo([1-9]\\d*)?',
        name: 'Analysis',
        component: () => import('@/views/ai-analysis'),
        hidden: true,
        meta: { title: 'menu.dashboard.analysis', keepAlive: false, icon: 'thunderbolt', permission: ['dashboard'] }
      },
      // 资产监测（隐藏）
      {
        path: '/portfolio',
        name: 'Portfolio',
        component: () => import('@/views/portfolio'),
        hidden: true,
        meta: { title: 'menu.dashboard.portfolio', keepAlive: true, icon: 'fund', permission: ['dashboard'] }
      },
      // 个人中心
      {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/profile'),
        meta: { title: 'menu.myProfile', keepAlive: false, icon: 'user', permission: ['dashboard'] }
      },
      // 会员/充值
      {
        path: '/billing',
        name: 'Billing',
        component: () => import('@/views/billing'),
        meta: { title: 'menu.billing', keepAlive: false, icon: 'wallet', permission: ['dashboard'] }
      },
      // 用户管理 (admin only)
      {
        path: '/user-manage',
        name: 'UserManage',
        component: () => import('@/views/user-manage'),
        meta: { title: 'menu.userManage', keepAlive: false, icon: 'team', permission: ['admin'] }
      },
      // 系统设置 (admin only) - 放在最后
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('@/views/settings'),
        meta: { title: 'menu.settings', keepAlive: false, icon: 'setting', permission: ['admin'] }
      }

      // other
      /*
      {
        path: '/other',
        name: 'otherPage',
        component: PageView,
        meta: { title: '其他组件', icon: 'slack', permission: [ 'dashboard' ] },
        redirect: '/other/icon-selector',
        children: [
          {
            path: '/other/icon-selector',
            name: 'TestIconSelect',
            component: () => import('@/views/other/IconSelectorView'),
            meta: { title: 'IconSelector', icon: 'tool', keepAlive: true, permission: [ 'dashboard' ] }
          },
          {
            path: '/other/list',
            component: RouteView,
            meta: { title: '业务布局', icon: 'layout', permission: [ 'support' ] },
            redirect: '/other/list/tree-list',
            children: [
              {
                path: '/other/list/tree-list',
                name: 'TreeList',
                component: () => import('@/views/other/TreeList'),
                meta: { title: '树目录表格', keepAlive: true }
              },
              {
                path: '/other/list/edit-table',
                name: 'EditList',
                component: () => import('@/views/other/TableInnerEditList'),
                meta: { title: '内联编辑表格', keepAlive: true }
              },
              {
                path: '/other/list/user-list',
                name: 'UserList',
                component: () => import('@/views/other/UserList'),
                meta: { title: '用户列表', keepAlive: true }
              },
              {
                path: '/other/list/role-list',
                name: 'RoleList',
                component: () => import('@/views/other/RoleList'),
                meta: { title: '角色列表', keepAlive: true }
              },
              {
                path: '/other/list/system-role',
                name: 'SystemRole',
                component: () => import('@/views/role/RoleList'),
                meta: { title: '角色列表2', keepAlive: true }
              },
              {
                path: '/other/list/permission-list',
                name: 'PermissionList',
                component: () => import('@/views/other/PermissionList'),
                meta: { title: '权限列表', keepAlive: true }
              }
            ]
          }
        ]
      }
      */
    ]
  },
  {
    path: '*',
    redirect: '/404',
    hidden: true
  }
]

/**
 * 基础路由
 * @type { *[] }
 */
export const constantRouterMap = [
  {
    path: '/user',
    component: UserLayout,
    redirect: '/user/login',
    hidden: true,
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import(/* webpackChunkName: "user" */ '@/views/user/Login')
      }
    ]
  },

  {
    path: '/404',
    component: () => import(/* webpackChunkName: "fail" */ '@/views/exception/404')
  }
]
