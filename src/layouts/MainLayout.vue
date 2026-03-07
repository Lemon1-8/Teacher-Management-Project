<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '64px' : '200px'" class="aside">
      <div class="logo">
        <el-icon size="24"><Management /></el-icon>
        <span v-if="!isCollapse">高校教师培训</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        :collapse="isCollapse"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <template v-for="item in menuRoutes" :key="item.path">
          <el-sub-menu v-if="item.children && item.children.filter(c => !c.meta?.hidden).length > 1" :index="resolvePath(item.path)">
            <template #title>
              <el-icon v-if="item.meta?.icon">
                <component :is="item.meta.icon" />
              </el-icon>
              <span>{{ item.meta?.title }}</span>
            </template>
            <el-menu-item 
              v-for="child in item.children.filter(c => !c.meta?.hidden)" 
              :key="child.path" 
              :index="resolvePath(item.path, child.path)"
            >
              {{ child.meta?.title }}
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="resolvePath(item.path, item.children?.[0]?.path)">
            <el-icon v-if="item.meta?.icon || item.children?.[0]?.meta?.icon">
              <component :is="item.meta?.icon || item.children?.[0]?.meta?.icon" />
            </el-icon>
            <template #title>{{ item.meta?.title || item.children?.[0]?.meta?.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Expand v-if="isCollapse" />
            <Fold v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-for="matched in matchedRoutes" :key="matched.path">
              {{ matched.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <!-- 通知中心 -->
          <el-dropdown trigger="click" class="notification-dropdown">
            <div class="notification-icon">
              <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="badge">
                <el-icon size="20"><Bell /></el-icon>
              </el-badge>
            </div>
            <template #dropdown>
              <el-dropdown-menu class="notification-list">
                <div class="notification-header">
                  <span>系统通知</span>
                  <el-button type="primary" link size="small" @click="handleMarkAllRead">全部已读</el-button>
                </div>
                <template v-if="notifications.length > 0">
                  <el-dropdown-item v-for="item in notifications" :key="item.id" @click="handleNotificationClick(item)">
                    <div class="notification-item">
                      <div class="title" :class="{ unread: !item.is_read }">{{ item.title }}</div>
                      <div class="content">{{ item.content }}</div>
                      <div class="time">{{ new Date(item.createdAt).toLocaleString() }}</div>
                    </div>
                  </el-dropdown-item>
                </template>
                <el-empty v-else description="暂无未读通知" :image-size="60" />
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-dropdown @command="handleCommand">
            <span class="el-dropdown-link">
              {{ userStore.userInfo?.name || '张老师' }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { getMe } from '../api/user'
import { getMyNotifications, markAsRead } from '../api/notification'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const unreadCount = ref(0)
const notifications = ref<any[]>([])

const fetchNotifications = async () => {
  try {
    const res: any = await getMyNotifications({ page: 1, limit: 5, is_read: 'false' })
    notifications.value = res.list
    unreadCount.value = res.total
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
  }
}

const handleNotificationClick = async (item: any) => {
  if (!item.is_read) {
    try {
      await markAsRead(item.id)
      fetchNotifications()
    } catch (error) {
      console.error('Mark read failed:', error)
    }
  }
  if (item.link) {
    router.push(item.link)
  }
}

const handleMarkAllRead = async () => {
  try {
    await markAsRead('all')
    ElMessage.success('全部已读')
    fetchNotifications()
  } catch (error) {
    console.error('Mark all read failed:', error)
  }
}

onMounted(async () => {
  if (userStore.token) {
    fetchNotifications()
    // 轮询通知 (可选，每分钟一次)
    setInterval(fetchNotifications, 60000)
  }

  if (userStore.token && !userStore.userInfo) {
    try {
      const res: any = await getMe()
      userStore.setUserInfo({
        id: res.id,
        employee_id: res.employee_id,
        username: res.username,
        role: res.role?.name || 'teacher',
        name: res.username,
        department: res.department
      })
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      userStore.logout()
      router.push('/login')
    }
  }
})

const isCollapse = ref(false)
const activeMenu = computed(() => route.path)

const menuRoutes = computed(() => {
  const root = router.options.routes.find(r => r.path === '/')
  const userRole = userStore.userInfo?.role || 'teacher'
  
  const filterRoutes = (routes: any[]) => {
    return routes.filter(route => {
      // 检查是否有 hidden 标记
      if (route.meta?.hidden) return false
      
      // 检查角色权限
      const requiredRoles = route.meta?.roles as string[]
      if (requiredRoles && !requiredRoles.includes(userRole)) {
        return false
      }
      
      // 递归检查子路由
      if (route.children) {
        route.children = filterRoutes(route.children)
        // 如果子路由过滤后为空（且不是 dashboard 这种单页面），则不显示父级
        if (route.children.length === 0 && route.path !== 'dashboard') {
          return false
        }
      }
      return true
    })
  }
  
  // 深度克隆以避免修改原始路由配置
  const originalRoutes = root?.children ? JSON.parse(JSON.stringify(root.children)) : []
  return filterRoutes(originalRoutes)
})

const matchedRoutes = computed(() => {
  return route.matched.filter(r => r.meta && r.meta.title && r.path !== '/')
})

const resolvePath = (parentPath: string, childPath?: string) => {
  let path = parentPath
  if (childPath) {
    path = `${parentPath}/${childPath}`
  }
  // Ensure absolute path
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  // Remove trailing slash if not root
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1)
  }
  return path
}

const handleCommand = (command: string) => {
  if (command === 'logout') {
    userStore.logout()
    router.push('/login')
  } else if (command === 'profile') {
    router.push('/user/profile')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background-color: #304156;
  color: #fff;
  transition: width 0.3s;
  overflow-x: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: bold;
  background-color: #2b2f3a;
}

.el-menu-vertical {
  border-right: none;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
}

.header-right {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.notification-icon {
  cursor: pointer;
  padding: 5px;
  color: #606266;
}

.notification-icon:hover {
  color: #409EFF;
}

.notification-list {
  width: 300px;
  max-height: 400px;
  overflow-y: auto;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #ebeef5;
  font-weight: bold;
}

.notification-item {
  padding: 5px 0;
}

.notification-item .title {
  font-weight: bold;
  margin-bottom: 5px;
  color: #303133;
}

.notification-item .title.unread {
  color: #409EFF;
}

.notification-item .title.unread::before {
  content: '●';
  color: #F56C6C;
  margin-right: 5px;
}

.notification-item .content {
  font-size: 12px;
  color: #606266;
  margin-bottom: 5px;
  line-height: 1.4;
  white-space: normal; /* 允许换行 */
}

.notification-item .time {
  font-size: 12px;
  color: #909399;
}

.el-dropdown-link {
  cursor: pointer;
  display: flex;
  align-items: center;
}

.main {
  background-color: #f0f2f5;
  padding: 20px;
}

/* fade-transform */
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
