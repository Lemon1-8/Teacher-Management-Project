import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import ParentView from '../components/ParentView.vue'
import { useUserStore } from '../stores/user'
import { getMe } from '../api/user'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/user/Login.vue'),
    meta: { title: '登录', guest: true }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/index.vue'),
        meta: { title: '仪表盘', icon: 'Odometer', roles: ['admin', 'teacher', 'trainer'] }
      },
      {
        path: 'training',
        name: 'Training',
        component: ParentView,
        redirect: '/training/list',
        meta: { title: '培训管理', icon: 'Reading', roles: ['admin', 'teacher', 'trainer'] },
        children: [
          {
            path: 'list',
            name: 'TrainingList',
            component: () => import('../views/training/List.vue'),
            meta: { title: '培训计划', roles: ['admin', 'teacher', 'trainer'] }
          },
          {
            path: 'detail/:id',
            name: 'TrainingDetail',
            component: () => import('../views/training/Detail.vue'),
            meta: { title: '培训详情', hidden: true, roles: ['admin', 'teacher', 'trainer'] }
          },
          {
            path: 'audit',
            name: 'TrainingAudit',
            component: () => import('../views/training/Audit.vue'),
            meta: { title: '报名审核', roles: ['admin', 'trainer'] }
          }
        ]
      },
      {
        path: 'user',
        name: 'UserCenter',
        component: ParentView,
        redirect: '/user/profile',
        meta: { title: '用户中心', icon: 'User', roles: ['admin', 'teacher', 'trainer'] },
        children: [
          {
            path: 'profile',
            name: 'UserProfile',
            component: () => import('../views/user/Profile.vue'),
            meta: { title: '个人信息', roles: ['admin', 'teacher', 'trainer'] }
          },
          {
            path: 'training',
            name: 'MyTraining',
            component: () => import('../views/user/MyTraining.vue'),
            meta: { title: '我的报名', roles: ['teacher'] }
          },
          {
            path: 'hours',
            name: 'MyHours',
            component: () => import('../views/user/MyHours.vue'),
            meta: { title: '我的学时', roles: ['teacher'] }
          }
        ]
      },
      {
        path: 'exam',
        name: 'Exam',
        component: ParentView,
        redirect: '/exam/list',
        meta: { title: '考试管理', icon: 'EditPen', roles: ['admin', 'teacher', 'trainer'] },
        children: [
          {
            path: 'list',
            name: 'ExamList',
            component: () => import('../views/exam/List.vue'),
            meta: { title: '在线考试', roles: ['admin', 'teacher', 'trainer'] }
          },
          {
            path: 'online/:id',
            name: 'OnlineExam',
            component: () => import('../views/exam/Online.vue'),
            meta: { title: '在线答题', hidden: true, roles: ['teacher'] }
          },
          {
            path: 'questions/:id',
            name: 'QuestionManage',
            component: () => import('../views/exam/Questions.vue'),
            meta: { title: '题目管理', hidden: true, roles: ['admin', 'trainer'] }
          },
          {
            path: 'results/:id',
            name: 'ExamResults',
            component: () => import('../views/exam/Results.vue'),
            meta: { title: '成绩管理', hidden: true, roles: ['admin', 'trainer'] }
          }
        ]
      },
      {
        path: 'message',
        name: 'Message',
        component: () => import('../views/message/Index.vue'),
        meta: { title: '消息中心', icon: 'ChatDotRound', roles: ['admin', 'teacher', 'trainer'] }
      },
      {
        path: 'system',
        name: 'System',
        component: ParentView,
        redirect: '/system/user',
        meta: { title: '系统设置', icon: 'Setting', roles: ['admin'] },
        children: [
          {
            path: 'user',
            name: 'UserManagement',
            component: () => import('../views/system/User.vue'),
            meta: { title: '用户管理', roles: ['admin'] }
          }
        ]
      }
    ]
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('../views/error/403.vue'),
    meta: { title: '无权访问', hidden: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from) => {
  const userStore = useUserStore()
  const token = userStore.token
  
  // 1. 如果是白名单页面（如登录页），直接进入
  if (to.meta.guest) {
    if (token) {
      return '/'
    }
    return
  }

  // 2. 如果未登录，跳转至登录页
  if (!token) {
    return '/login'
  }

  // 3. 如果已登录但没有用户信息（刷新页面后），尝试从后端恢复用户信息
  if (!userStore.userInfo) {
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
      console.error('Failed to restore user info:', error)
      userStore.logout()
      return '/login'
    }
  }

  const userRole = userStore.userInfo?.role

  // 4. 角色权限检查
  const requiredRoles = to.meta.roles as string[]
  if (requiredRoles && !requiredRoles.includes(userRole)) {
    return '/403'
  }
  
  if (to.meta.title) {
    document.title = `${to.meta.title} - 高校教师培训管理系统`
  }
})

export default router
