import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: null as any,
    roles: [] as string[]
  }),
  getters: {
    isLoggedIn: (state) => !!state.token
  },
  actions: {
    setToken(token: string) {
      this.token = token
      localStorage.setItem('token', token)
    },
    setUserInfo(userInfo: any) {
      this.userInfo = userInfo
      this.roles = userInfo.roles || [userInfo.role] || []
    },
    logout() {
      this.token = ''
      this.userInfo = null
      this.roles = []
      localStorage.removeItem('token')
    }
  }
})
