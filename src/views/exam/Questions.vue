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
        <el-button type="primary" @click="openAiDialog" style="margin-right: 10px">
          <el-icon style="margin-right: 4px"><Cpu /></el-icon>AI 生成题目
        </el-button>
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
        <p>请下载"Excel模板"并按格式填写。支持 .xlsx 和 .xls。</p>
        
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
        <p class="tip">提示：题目编号请使用数字加点（如 1.），选项请使用大写字母加点（如 A.），答案行必须以"答案："开头。</p>
      </div>
    </el-dialog>

    <!-- AI 生成题目弹窗 -->
    <el-dialog v-model="aiVisible" title="AI 智能出题" width="800px" :close-on-click-modal="false">
      <el-form label-width="100px">
        <el-form-item label="素材来源">
          <el-radio-group v-model="aiSource">
            <el-radio label="auto">自动提取（从关联培训内容）</el-radio>
            <el-radio label="file">上传文件</el-radio>
            <el-radio label="manual">手动输入</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="aiSource === 'file'" label="选择文件">
          <div>
            <input
              type="file"
              ref="aiFileInput"
              accept=".xlsx,.xls,.docx,.pdf"
              @change="handleAiFileChange"
              style="margin-bottom: 8px"
            />
            <span v-if="aiFile" style="margin-left: 10px; color: #67c23a">已选择: {{ aiFile.name }}</span>
            <div class="el-upload__tip">支持 Excel、Word、PDF 格式，文件内容将被 AI 分析后出题</div>
          </div>
        </el-form-item>
        <el-form-item v-if="aiSource === 'manual'" label="培训内容">
          <el-input v-model="aiText" type="textarea" :rows="6" placeholder="请粘贴培训内容文本（至少50字）" />
        </el-form-item>
        <el-form-item label="生成数量">
          <div style="display: flex; gap: 20px; flex-wrap: wrap">
            <span>单选题 <el-input-number v-model="aiSingleCount" :min="0" :max="20" size="small" style="width: 80px" /></span>
            <span>多选题 <el-input-number v-model="aiMultipleCount" :min="0" :max="20" size="small" style="width: 80px" /></span>
            <span>判断题 <el-input-number v-model="aiTruefalseCount" :min="0" :max="20" size="small" style="width: 80px" /></span>
            <span>每题分值 <el-input-number v-model="aiScore" :min="1" :max="20" size="small" style="width: 80px" /></span>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleAiGenerate" :loading="aiGenerating" :disabled="aiSingleCount + aiMultipleCount + aiTruefalseCount === 0">
            开始生成
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 生成结果预览 -->
      <div v-if="aiResults.length > 0" class="ai-results">
        <el-divider />
        <h4>生成结果（共 {{ aiResults.length }} 题，请选择要采用的题目）</h4>
        <div v-for="(q, i) in aiResults" :key="i" class="ai-result-item" :class="{ discarded: q._discarded }">
          <div class="ai-result-header">
            <el-tag :type="q.type === 'single' ? 'success' : q.type === 'multiple' ? 'warning' : 'info'" size="small">
              {{ q.type === 'single' ? '单选' : q.type === 'multiple' ? '多选' : '判断' }}
            </el-tag>
            <span class="ai-result-content">{{ q.content }}</span>
          </div>
          <div class="ai-result-options">
            <span v-for="(val, key) in q.options" :key="key">{{ key }}. {{ val }}&nbsp;&nbsp;</span>
          </div>
          <div class="ai-result-answer">答案：{{ Array.isArray(q.answer) ? q.answer.join(', ') : q.answer }} | 分值：{{ q.score }} | 解析：{{ q.analysis }}</div>
          <div class="ai-result-actions">
            <el-button v-if="q._discarded" type="info" size="small" @click="q._discarded = false">撤销丢弃</el-button>
            <el-button v-else type="danger" size="small" @click="q._discarded = true">丢弃</el-button>
          </div>
        </div>
        <div style="margin-top: 16px; text-align: right">
          <el-button @click="aiVisible = false; aiResults = []">取消</el-button>
          <el-button type="primary" @click="adoptAiResults">
            采用选中题目 ({{ aiResults.filter(q => !q._discarded).length }} 道)
          </el-button>
        </div>
      </div>
    </el-dialog>

    <el-alert
      title="提示"
      type="info"
      description="修改后请务必点击右上角的保存所有修改按钮以同步到服务器。"
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

      <el-empty v-if="questions.length === 0" description="暂无题目，请点击上方添加题目按钮" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'
import { getExamQuestions, saveExamQuestions, getExamDetail, importQuestions, generateQuestions } from '../../api/exam'

const router = useRouter()
const route = useRoute()
const examId = parseInt(route.params.id as string)

const loading = ref(false)
const helpVisible = ref(false)
const examTitle = ref('')
const questions = ref<any[]>([])

// AI 生成相关
const aiVisible = ref(false)
const aiSource = ref('auto')
const aiText = ref('')
const aiFile = ref<File | null>(null)
const aiFileInput = ref<HTMLInputElement | null>(null)
const aiSingleCount = ref(5)
const aiMultipleCount = ref(3)
const aiTruefalseCount = ref(2)
const aiScore = ref(5)
const aiGenerating = ref(false)
const aiResults = ref<any[]>([])

const handleAiFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (files && files.length > 0) {
    aiFile.value = files[0]
    console.log('AI 文件已选择:', files[0].name, '大小:', files[0].size)
  } else {
    aiFile.value = null
  }
}

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

const openAiDialog = () => {
  aiSource.value = 'auto'
  aiText.value = ''
  aiFile.value = null
  if (aiFileInput.value) {
    aiFileInput.value.value = ''
  }
  aiSingleCount.value = 5
  aiMultipleCount.value = 3
  aiTruefalseCount.value = 2
  aiScore.value = 5
  aiResults.value = []
  aiVisible.value = true
}

const handleAiGenerate = async () => {
  console.log('=== AI 生成开始 ===')
  console.log('aiSource:', aiSource.value, 'aiFile:', aiFile.value?.name, 'aiText长度:', aiText.value.length)
  if (aiSource.value === 'file' && !aiFile.value) {
    console.log('文件未选择，中止')
    ElMessage.warning('请先选择文件')
    return
  }
  if (aiSource.value === 'manual' && aiText.value.trim().length < 50) {
    ElMessage.warning('手动输入的文本内容至少需要50字')
    return
  }
  aiGenerating.value = true
  aiResults.value = []
  try {
    const params: any = {
      singleCount: aiSingleCount.value,
      multipleCount: aiMultipleCount.value,
      truefalseCount: aiTruefalseCount.value,
      score: aiScore.value,
    }
    if (aiSource.value === 'manual') {
      params.text = aiText.value
    }
    const file = aiSource.value === 'file' ? aiFile.value : undefined
    console.log('调用 generateQuestions, params:', params, 'file:', file?.name)

    const res: any = await generateQuestions(examId, params, file)
    console.log('API 原始返回:', JSON.stringify(res))
    console.log('res.questions:', res.questions)
    aiResults.value = (res.questions || []).map((q: any) => ({
      ...q,
      answer: q.type === 'multiple' && typeof q.answer === 'string'
        ? q.answer.split(',').map((s: string) => s.trim())
        : q.answer,
      _discarded: false,
    }))
    console.log('aiResults 设置完成，共', aiResults.value.length, '题')
    ElMessage.success(res.message || `AI 成功生成 ${aiResults.value.length} 道题目`)
  } catch (error: any) {
    console.error('AI 生成异常:', error)
    ElMessage.error(error?.message || 'AI 生成失败，请重试')
  } finally {
    aiGenerating.value = false
  }
}

const adoptAiResults = () => {
  const adopted = aiResults.value.filter((q: any) => !q._discarded)
  if (adopted.length === 0) {
    ElMessage.warning('请至少选择一道题目')
    return
  }
  // 追加到题目列表（作为未保存项）
  adopted.forEach((q: any) => {
    const { _discarded, ...questionData } = q
    questions.value.push({
      ...questionData,
      tempId: Math.random().toString(36).substring(7),
    })
  })
  ElMessage.success(`已添加 ${adopted.length} 道题目，请点击"保存所有修改"保存`)
  aiVisible.value = false
  aiResults.value = []
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

.ai-results h4 {
  margin-bottom: 12px;
}

.ai-result-item {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  transition: opacity 0.2s;
}

.ai-result-item.discarded {
  opacity: 0.35;
}

.ai-result-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}

.ai-result-content {
  font-weight: 600;
  line-height: 1.5;
}

.ai-result-options {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
  margin-left: 50px;
}

.ai-result-answer {
  font-size: 13px;
  color: #409eff;
  margin-bottom: 8px;
  margin-left: 50px;
}

.ai-result-actions {
  text-align: right;
}
</style>
