<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <el-col :span="6" v-for="item in stats" :key="item.title">
        <el-card shadow="hover" class="stat-card" @click="handleStatClick(item)">
          <template #header>
            <div class="card-header">
              <span>{{ item.title }}</span>
              <el-tag :type="item.type">{{ item.tag }}</el-tag>
            </div>
          </template>
          <div class="card-value">{{ item.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 管理员视角图表 -->
    <template v-if="role === 'admin'">
      <el-row :gutter="20" class="mt-20">
        <el-col :span="24">
          <el-card shadow="hover" class="welcome-card">
            <h2>欢迎回来，管理员</h2>
            <p>这里展示全校培训数据的实时概览。目前系统运行正常，共有 {{ stats[0]?.value }} 名教师在册。</p>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- 教师/讲师视角图表 -->
    <template v-else>
      <el-row :gutter="20" class="mt-20">
        <el-col :span="16">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>{{ role === 'trainer' ? '培训报名趋势 (近6个月)' : '月度学时统计' }}</span>
              </div>
            </template>
            <div ref="trendChart" style="height: 350px"></div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover">
            <template #header>
              <div class="card-header">
                <span>{{ role === 'trainer' ? '发布培训类型分布' : '学时来源分布' }}</span>
              </div>
            </template>
            <div ref="typeChart" style="height: 350px"></div>
          </el-card>
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getDashboardData, getMyHours } from '../../api/statistics'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const userStore = useUserStore()
const stats = ref<any[]>([])
const trendChart = ref<HTMLElement>()
const typeChart = ref<HTMLElement>()
const role = ref('')

const handleStatClick = (item: any) => {
  if (item.link) {
    router.push(item.link)
  }
}

const fetchData = async () => {
  try {
    const res: any = await getDashboardData()
    stats.value = res.stats
    role.value = res.role

    // 仅教师加载图表数据
    if (res.role === 'teacher') {
      const hoursRes: any = await getMyHours()
      initCharts(hoursRes)
    } else if (res.role === 'trainer') {
      // 讲师加载图表
      initTrainerCharts(res.charts)
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  }
}

const initTrainerCharts = (data: any) => {
  if (trendChart.value && data.trend) {
    const chart = echarts.init(trendChart.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.trend.categories
      },
      yAxis: { type: 'value', name: '人数' },
      series: [{
        data: data.trend.series,
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.3 },
        itemStyle: { color: '#67C23A' }
      }]
    })
  }

  if (typeChart.value && data.typeDistribution) {
    const chart = echarts.init(typeChart.value)
    chart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: '0%' },
      series: [{
        name: '培训类型',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
        data: data.typeDistribution
      }]
    })
  }
}

const initCharts = (hoursData: any[]) => {
  // 趋势图 (月度学时)
  if (trendChart.value) {
    const chart = echarts.init(trendChart.value)
    const monthlyData = new Array(12).fill(0)
    const currentYear = new Date().getFullYear()
    
    hoursData.forEach((item: any) => {
      const date = new Date(item.acquire_time)
      if (date.getFullYear() === currentYear) {
        monthlyData[date.getMonth()] += parseFloat(item.hours)
      }
    })

    chart.setOption({
      tooltip: { 
        trigger: 'axis',
        formatter: '{b}<br/>{a}: {c} 学时'
      },
      xAxis: {
        type: 'category',
        data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      },
      yAxis: { type: 'value', name: '学时' },
      series: [{
        name: '获得学时',
        data: monthlyData,
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.3 },
        itemStyle: { color: '#409EFF' }
      }]
    })
  }

  // 分布图 (类型分布)
  if (typeChart.value) {
    const chart = echarts.init(typeChart.value)
    // 简单统计类型 (这里简化处理，实际应从后端获取聚合数据)
    const typeCount: any = { 'training': 0, 'exam': 0, 'other': 0 }
    hoursData.forEach((item: any) => {
      // 兼容后端 type 可能是中文或英文
      const typeKey = item.type === 'training' || item.type === '培训' ? 'training' 
                    : item.type === 'exam' || item.type === '考试' ? 'exam' 
                    : 'other'
      typeCount[typeKey] = (typeCount[typeKey] || 0) + parseFloat(item.hours)
    })

    chart.setOption({
      tooltip: { 
        trigger: 'item',
        formatter: '{b}: {c} 学时 ({d}%)'
      },
      legend: { bottom: '0%' },
      series: [{
        name: '学时来源',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: '18', fontWeight: 'bold', formatter: '{b}\n{c} 学时' } },
        data: [
          { value: typeCount.training, name: '培训学时' },
          { value: typeCount.exam, name: '考试学时' },
          { value: typeCount.other, name: '其他学时' }
        ]
      }]
    })
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.mt-20 {
  margin-top: 20px;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  color: #303133;
}

.welcome-card {
  height: 350px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
}

.welcome-card h2 {
  color: #409EFF;
  margin-bottom: 20px;
}
</style>
