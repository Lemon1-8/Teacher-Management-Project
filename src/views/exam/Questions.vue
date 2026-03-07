<template>
  <div class="question-manage-container" v-loading="loading">
    <div class="header">
      <el-button icon="ArrowLeft" @click="router.back()">返回列表</el-button>
      <span class="title">题目管理 - {{ examTitle }}</span>
      <div class="actions">
        <el-upload
          action="#"
          :show-file-list="false"
          :http-request="handleImport"
          accept=".xlsx,.xls,.docx,.pdf"
          style="display: inline-block; margin-right: 10px"
        >
          <el-button type="warning">导入题目</el-button>
        </el-upload>
        <el-tooltip content="支持 Excel、Word、PDF 格式。请点击下载查看 Word/PDF 编写规范。" placement="bottom">
          <el-button @click="showFormatHelp">格式说明</el-button>
        </el-tooltip>
        <el-button @click="downloadTemplate">Excel模板</el-button>
        <el-button type="primary" @click="addQuestion">添加题目</el-button>
        <el-button type="success" @click="saveAll">保存所有修改</el-button>
      </div>
    </div>

    <!-- 格式说明弹窗 -->
    <el-dialog v-model="helpVisible" title="题目导入格式说明" width="600px">
      <div class="help-content">
        <h3>1. Excel 格式</h3>
        <p>请下载“Excel模板”并按格式填写。支持 .xlsx 和 .xls。</p>
        
        <h3>2. Word/PDF 格式</h3>
        <p>支持 .docx 和 .pdf。请严格按照以下格式编写（注意标点符号）：</p>
        <div class="code-block">
          1. 题目内容...<br>
          A. 选项内容<br>
          B. 选项内容<br>
          C. 选项内容<br>
          D. 选项内容<br>
          答案：A<br>
          分值：5<br>
          解析：...<br>
          <br>
          2. 多选题内容...<br>
          A. 选项1<br>
          B. 选项2<br>
          C. 选项3<br>
          D. 选项4<br>
          答案：A,B<br>
          分值：5<br>
        </div>
        <p class="tip">提示：题目编号请使用数字加点（如 1.），选项请使用大写字母加点（如 A.），答案行必须以“答案：”开头。</p>
      </div>
    </el-dialog>

    <el-alert
      title="提示"
      type="info"
      description="修改后请务必点击右上角的“保存所有修改”按钮以同步到服务器。"
      show-icon
      class="mb-20"
    />

    <div class="question-list">
      <draggable 
        v-model="questions" 
        item-key="tempId"
        handle=".drag-handle"
        ghost-class="ghost"
      >
        <template #item="{ element, index }">
          <el-card class="question-card mb-20">
            <template #header>
              <div class="card-header">
                <div class="left">
                  <el-icon class="drag-handle"><Rank /></el-icon>
                  <span class="index">第 {{ index + 1 }} 题</span>
                  <el-select v-model="element.type" style="width: 120px; margin-left: 10px" @change="handleTypeChange(element)">
                    <el-option label="单选题" value="single" />
                    <el-option label="多选题" value="multiple" />
                    <el-option label="判断题" value="truefalse" />
                  </el-select>
                </div>
                <div class="right">
                  <span class="score-label">分值：</span>
                  <el-input-number v-model="element.score" :min="1" size="small" style="width: 80px; margin-right: 15px" />
                  <el-button type="danger" icon="Delete" circle size="small" @click="removeQuestion(index)" />
                </div>
              </div>
            </template>

            <el-form label-width="80px">
              <el-form-item label="题目内容">
                <el-input v-model="element.content" type="textarea" :rows="2" placeholder="请输入题目内容" />
              </el-form-item>

              <!-- 选项编辑 (单选/多选) -->
              <template v-if="element.type !== 'truefalse'">
                <el-form-item label="选项设置">
                  <div v-for="(val, key) in element.options" :key="key" class="option-row">
                    <span class="option-key">{{ key }}.</span>
                    <el-input v-model="element.options[key]" placeholder="请输入选项内容" />
                    <el-button type="danger" icon="Minus" circle size="small" @click="removeOption(element, key)" :disabled="Object.keys(element.options).length <= 2" />
                  </div>
                  <el-button type="primary" size="small" link icon="Plus" @click="addOption(element)" :disabled="Object.keys(element.options).length >= 8">
                    添加选项
                  </el-button>
                </el-form-item>
              </template>

              <!-- 答案设置 -->
              <el-form-item label="标准答案">
                <!-- 单选/判断 -->
                <el-radio-group v-if="element.type === 'single' || element.type === 'truefalse'" v-model="element.answer">
                  <el-radio v-for="(val, key) in element.options" :key="key" :value="key">{{ key }}</el-radio>
                </el-radio-group>
                <!-- 多选 -->
                <el-checkbox-group v-else v-model="element.answer">
                  <el-checkbox v-for="(val, key) in element.options" :key="key" :label="key">{{ key }}</el-checkbox>
                </el-checkbox-group>
              </el-form-item>

              <el-form-item label="答案解析">
                <el-input v-model="element.analysis" type="textarea" placeholder="请输入题目解析（可选）" />
              </el-form-item>
            </el-form>
          </el-card>
        </template>
      </draggable>

      <el-empty v-if="questions.length === 0" description="暂无题目，请点击上方“添加题目”按钮" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'
import { getExamQuestions, saveExamQuestions, getExamDetail, importQuestions } from '../../api/exam'

const router = useRouter()
const route = useRoute()
const examId = parseInt(route.params.id as string)

const loading = ref(false)
const helpVisible = ref(false)
const examTitle = ref('')
const questions = ref<any[]>([])

const showFormatHelp = () => {
  helpVisible.value = true
}

const handleImport = async (options: any) => {
  loading.value = true
  try {
    const res: any = await importQuestions(examId, options.file)
    ElMessage.success(res.message || '导入成功')
    fetchData()
  } catch (error) {
    ElMessage.error('导入失败')
  } finally {
    loading.value = false
  }
}

const downloadTemplate = () => {
  const data = [
    { '题目类型': '单选题', '题目内容': '示例：中国的首都是哪里？', '选项A': '上海', '选项B': '北京', '选项C': '广州', '选项D': '深圳', '正确答案': 'B', '分值': 5, '解析': '北京是中国的首都' },
    { '题目类型': '多选题', '题目内容': '示例：属于直辖市的是？', '选项A': '北京', '选项B': '天津', '选项C': '上海', '选项D': '重庆', '正确答案': 'A,B,C,D', '分值': 5, '解析': '' },
    { '题目类型': '判断题', '题目内容': '示例：地球是圆的', '正确答案': 'A', '分值': 5, '解析': 'A代表正确，B代表错误' }
  ]
  // 简单的前端生成 CSV 下载，实际项目中建议后端提供下载接口
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + "题目类型,题目内容,选项A,选项B,选项C,选项D,正确答案,分值,解析\n"
    + data.map(e => `${e['题目类型']},${e['题目内容']},${e['选项A']||''},${e['选项B']||''},${e['选项C']||''},${e['选项D']||''},"${e['正确答案']||''}",${e['分值']},${e['解析']}`).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "题目导入模板.csv");
  document.body.appendChild(link);
  link.click();
}

const fetchData = async () => {
  loading.value = true
  try {
    const examRes: any = await getExamDetail(examId)
    examTitle.value = examRes.title

    const res: any = await getExamQuestions(examId)
    questions.value = res.map((q: any) => ({
      ...q,
      tempId: Math.random().toString(36).substring(7)
    }))
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

const addQuestion = () => {
  questions.value.push({
    tempId: Math.random().toString(36).substring(7),
    type: 'single',
    content: '',
    options: { 'A': '', 'B': '', 'C': '', 'D': '' },
    answer: '',
    score: 5,
    analysis: '',
    sort: questions.value.length
  })
}

const removeQuestion = (index: number) => {
  questions.value.splice(index, 1)
}

const handleTypeChange = (element: any) => {
  if (element.type === 'truefalse') {
    element.options = { 'A': '正确', 'B': '错误' }
    element.answer = ''
  } else if (element.type === 'multiple') {
    element.answer = []
    if (Object.keys(element.options).length < 2) {
      element.options = { 'A': '', 'B': '', 'C': '', 'D': '' }
    }
  } else {
    element.answer = ''
    if (Object.keys(element.options).length < 2) {
      element.options = { 'A': '', 'B': '', 'C': '', 'D': '' }
    }
  }
}

const addOption = (element: any) => {
  const keys = Object.keys(element.options)
  const lastKey = keys[keys.length - 1]
  const nextKey = String.fromCharCode(lastKey.charCodeAt(0) + 1)
  element.options[nextKey] = ''
}

const removeOption = (element: any, key: string) => {
  delete element.options[key]
  // 如果答案包含已删除的选项，清除它
  if (Array.isArray(element.answer)) {
    element.answer = element.answer.filter((a: any) => a !== key)
  } else if (element.answer === key) {
    element.answer = ''
  }
}

const saveAll = async () => {
  // 简单校验
  for (let i = 0; i < questions.value.length; i++) {
    const q = questions.value[i]
    if (!q.content) return ElMessage.warning(`第 ${i + 1} 题未填写题目内容`)
    if (!q.answer || (Array.isArray(q.answer) && q.answer.length === 0)) {
      return ElMessage.warning(`第 ${i + 1} 题未设置标准答案`)
    }
  }

  loading.value = true
  try {
    await saveExamQuestions(examId, questions.value)
    ElMessage.success('所有题目保存成功')
    fetchData()
  } catch (error) {
    console.error('Save failed:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.question-manage-container {
  padding: 20px;
}

.header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.header .title {
  font-size: 20px;
  font-weight: bold;
  flex: 1;
}

.mb-20 {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left {
  display: flex;
  align-items: center;
}

.drag-handle {
  cursor: move;
  margin-right: 15px;
  color: #909399;
}

.index {
  font-weight: bold;
}

.score-label {
  font-size: 14px;
  color: #606266;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.option-key {
  font-weight: bold;
  width: 20px;
}

.ghost {
  opacity: 0.5;
  background: #c8ebfb;
}

.help-content h3 {
  margin-top: 0;
  color: #303133;
}

.code-block {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  font-family: monospace;
  margin: 10px 0;
  line-height: 1.6;
}

.tip {
  font-size: 12px;
  color: #909399;
}
</style>
