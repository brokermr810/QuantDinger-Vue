import storage from 'store'
import expirePlugin from 'store/plugins/expire'
import { login, logout, getUserInfo } from '@/api/login'
import { ACCESS_TOKEN, USER_INFO, USER_ROLES } from '@/store/mutation-types'
import { welcome } from '@/utils/util'

storage.addPlugin(expirePlugin)

const DEFAULT_ROLE = { id: 'default', permissionList: [] }

function normalizeRoles (roles) {
  if (!roles) return []
  if (Array.isArray(roles)) return roles
  return [roles]
}

function getStoredInfo () {
  const info = storage.get(USER_INFO) || {}
  return (info && typeof info === 'object') ? info : {}
}

function getStoredRoles () {
  const roles = storage.get(USER_ROLES) || []
  return normalizeRoles(roles)
}

function getStoredToken () {
  const token = storage.get(ACCESS_TOKEN)
  return typeof token === 'string' ? token : (token && token.token) ? token.token : token
}

const initialInfo = getStoredInfo()
// If is_demo is missing (legacy cache), force roles to empty to trigger GetInfo in permission.js
let initialRoles = getStoredRoles()
if (initialInfo && typeof initialInfo.is_demo === 'undefined') {
  initialRoles = []
}
const initialToken = getStoredToken() || ''
const initialName = initialInfo.nickname || initialInfo.username || ''
const initialAvatar = initialInfo.avatar || ''
const initialWelcome = initialName ? welcome() : ''
const user = {
  state: {
    token: initialToken,
    name: initialName,
    welcome: initialWelcome,
    avatar: initialAvatar,
    roles: initialRoles,
    info: initialInfo
  },

  mutations: {
    SET_TOKEN: (state, token) => {
      state.token = token
    },
    SET_NAME: (state, { name, welcome }) => {
      state.name = name
      state.welcome = welcome
    },
    SET_AVATAR: (state, avatar) => {
      state.avatar = avatar
    },
    SET_ROLES: (state, roles) => {
      state.roles = roles
    },
    SET_INFO: (state, info) => {
      state.info = info
    }
  },

  actions: {
    // 登录
    Login ({ commit, dispatch }, userInfo) {
      return new Promise((resolve, reject) => {
        login(userInfo).then(response => {
          // 适配 Python 后端响应格式
          if (response && response.code === 1 && response.data) {
            const result = response.data
            const token = result.token
            const info = result.userinfo || {}

            const expiresAt = new Date().getTime() + 7 * 24 * 60 * 60 * 1000
            storage.set(ACCESS_TOKEN, token, expiresAt)
            commit('SET_TOKEN', token)
            commit('SET_INFO', info)
            storage.set(USER_INFO, info, expiresAt)

            // 设置基本信息
            const name = info.nickname || info.username || 'User'
            commit('SET_NAME', { name: name, welcome: welcome() })
            commit('SET_AVATAR', info.avatar || '/avatar2.jpg')

            // 从服务器返回的角色信息设置角色
            let roles = [DEFAULT_ROLE]
            if (info.role) {
              // role: { id: 'admin', permissions: [...] }
              const roleId = info.role.id || info.role
              const permissions = info.role.permissions || []
              roles = [{
                id: roleId,
                permissionList: permissions.length > 0 ? permissions : ['dashboard']
              }]
            }
            commit('SET_ROLES', roles)
            storage.set(USER_ROLES, roles, expiresAt)

            // 重置路由，强制重新生成（根据新用户的角色）
            dispatch('ResetRoutes')

            resolve(response)
          } else {
            reject(new Error((response && response.msg) || 'Login failed'))
          }
        }).catch(error => {
          reject(error)
        })
      })
    },

    // Web3 登录完成后的统一处理
    Web3LoginFinalize ({ commit }, payload) {
      return new Promise((resolve, reject) => {
        try {
          const { token, userInfo } = payload
          if (!token || !userInfo) {
            reject(new Error('登录数据异常'))
            return
          }
          storage.set(ACCESS_TOKEN, token, new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
          commit('SET_TOKEN', token)
          commit('SET_INFO', userInfo)

          if (userInfo.nickname) {
            commit('SET_NAME', { name: userInfo.nickname, welcome: welcome() })
          } else if (userInfo.username) {
            commit('SET_NAME', { name: userInfo.username, welcome: welcome() })
          }

          if (userInfo.avatar) {
            commit('SET_AVATAR', userInfo.avatar)
          }

          if (userInfo.role) {
            commit('SET_ROLES', userInfo.role)
          } else if (userInfo.roles) {
            commit('SET_ROLES', userInfo.roles)
          } else {
            commit('SET_ROLES', [{ id: 'default', permissionList: [] }])
          }

          resolve()
        } catch (e) {
          reject(e)
        }
      })
    },

    // 刷新用户信息
    FetchUserInfo ({ commit }) {
      return new Promise((resolve, reject) => {
        getUserInfo().then(res => {
          if (res && res.code === 1 && res.data) {
            const info = res.data
            commit('SET_INFO', info)
            const expiresAt = new Date().getTime() + 7 * 24 * 60 * 60 * 1000
            storage.set(USER_INFO, info, expiresAt)
            if (info.nickname) {
              commit('SET_NAME', { name: info.nickname, welcome: welcome() })
            } else if (info.username) {
              commit('SET_NAME', { name: info.username, welcome: welcome() })
            }
            if (info.avatar) {
              commit('SET_AVATAR', info.avatar)
            }
            resolve(info)
          } else {
            reject(new Error((res && res.msg) || '获取用户信息失败'))
          }
        }).catch(err => reject(err))
      })
    },

    // 获取用户信息（从 store 中获取，不再请求接口）
    GetInfo ({ commit, state }) {
      return new Promise((resolve, reject) => {
        // 用户信息已经在登录时保存到 store 中，直接返回
        // 增加 check: 必须包含 is_demo 字段，否则视为过期缓存，强制刷新
        if (state.info && Object.keys(state.info).length > 0 && typeof state.info.is_demo !== 'undefined') {
          // 补全 Roles
          const info = state.info
          if (info.role) {
            const roles = normalizeRoles(info.role)
            commit('SET_ROLES', roles)
            storage.set(USER_ROLES, roles, new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
          } else if (info.roles) {
            const roles = normalizeRoles(info.roles)
            commit('SET_ROLES', roles)
            storage.set(USER_ROLES, roles, new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
          } else {
            commit('SET_ROLES', [DEFAULT_ROLE])
            storage.set(USER_ROLES, [DEFAULT_ROLE], new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
          }
          resolve(state.info)
        } else {
          // 尝试主动拉取一次
          getUserInfo().then(res => {
            if (res && res.code === 1 && res.data) {
              const info = res.data
              commit('SET_INFO', info)
              storage.set(USER_INFO, info, new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
              if (info.nickname) {
                commit('SET_NAME', { name: info.nickname, welcome: welcome() })
              } else if (info.username) {
                commit('SET_NAME', { name: info.username, welcome: welcome() })
              }
              if (info.avatar) {
                commit('SET_AVATAR', info.avatar)
              }
              // 关键修复：设置角色，防止路由守卫死循环
              if (info.role) {
                const roles = normalizeRoles(info.role)
                commit('SET_ROLES', roles)
                storage.set(USER_ROLES, roles, new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
              } else if (info.roles) {
                const roles = normalizeRoles(info.roles)
                commit('SET_ROLES', roles)
                storage.set(USER_ROLES, roles, new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
              } else {
                commit('SET_ROLES', [DEFAULT_ROLE])
                storage.set(USER_ROLES, [DEFAULT_ROLE], new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
              }
              resolve(info)
            } else {
              reject(new Error((res && res.msg) || '用户信息不存在'))
            }
          }).catch(err => reject(err))
        }
      })
    },

    // 登出
    Logout ({ commit, dispatch }) {
      return new Promise((resolve) => {
        logout().then(() => {
          commit('SET_TOKEN', '')
          commit('SET_ROLES', [])
          commit('SET_INFO', {})
          commit('SET_NAME', { name: '', welcome: '' })
          commit('SET_AVATAR', '')
          storage.remove(ACCESS_TOKEN)
          storage.remove(USER_INFO)
          storage.remove(USER_ROLES)
          // 重置路由
          dispatch('ResetRoutes')
          resolve()
        }).catch(() => {
          // 登出失败时也继续执行，确保清理本地状态
          storage.remove(ACCESS_TOKEN)
          storage.remove(USER_INFO)
          storage.remove(USER_ROLES)
          // 重置路由
          dispatch('ResetRoutes')
          resolve()
        }).finally(() => {
        })
      })
    }

  }
}

export default user
