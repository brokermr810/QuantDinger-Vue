<template>
  <div class="strategy-editor" :class="{ 'theme-dark': isDark }">
    <a-row :gutter="16" class="editor-layout">
      <a-col :xs="24" :md="16" class="code-col">
        <div class="code-section">
          <div class="section-header">
            <div class="section-title-wrap">
              <span class="section-title">
                <a-icon type="code" /> {{ $t('trading-assistant.editor.title') }}
              </span>
              <a-tag v-if="selectedTemplate" color="blue" class="current-template-tag">
                {{ $t(`trading-assistant.template.${selectedTemplate.key}`) }}
              </a-tag>
            </div>
            <div class="section-actions">
              <a-button
                type="link"
                size="small"
                @click="handleVerify"
                :loading="verifying"
                class="verify-btn"
              >
                <a-icon type="check-circle" />
                {{ $t('trading-assistant.editor.verify') }}
              </a-button>
            </div>
          </div>
          <div ref="editorContainer" class="code-editor-container"></div>
        </div>
      </a-col>

      <a-col :xs="24" :md="8" class="side-col">
        <a-tabs v-model="activeTab" size="small" class="side-tabs">
          <a-tab-pane key="templates" :tab="$t('trading-assistant.editor.templateTab')">
            <div class="panel-intro">
              <div class="panel-intro__title">{{ $t('trading-assistant.editor.templateIntroTitle') }}</div>
              <div class="panel-intro__desc">{{ $t('trading-assistant.editor.templateIntroDesc') }}</div>
            </div>
            <div class="template-list">
              <div
                v-for="tpl in templates"
                :key="tpl.key"
                class="template-item"
                :class="{ active: selectedTemplateKey === tpl.key }"
                @click="loadTemplate(tpl.key, { focusParams: true, resetParams: true })"
              >
                <div class="tpl-header">
                  <span class="tpl-icon">{{ tpl.icon }}</span>
                  <span class="tpl-name">{{ $t(`trading-assistant.template.${tpl.key}`) }}</span>
                </div>
                <p class="tpl-desc">{{ $t(`trading-assistant.template.${tpl.key}Desc`) }}</p>
                <a-button type="link" size="small" class="tpl-use-btn">
                  {{ $t('trading-assistant.template.useTemplate') }}
                  <a-icon type="arrow-right" />
                </a-button>
              </div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="params" :tab="$t('trading-assistant.editor.paramsTab')">
            <div v-if="selectedTemplate" class="params-panel">
              <div class="panel-intro">
                <div class="panel-intro__title">
                  {{ $t(`trading-assistant.template.${selectedTemplate.key}`) }}
                </div>
                <div class="panel-intro__desc">
                  {{ $t(`trading-assistant.template.${selectedTemplate.key}Desc`) }}
                </div>
              </div>
              <a-alert
                type="info"
                show-icon
                class="params-tip"
                :message="$t('trading-assistant.editor.paramsHint')"
              />
              <div class="param-list">
                <div v-for="param in selectedTemplate.params" :key="param.name" class="param-item">
                  <div class="param-item__label-row">
                    <span class="param-item__label">{{ getParamLabel(param) }}</span>
                    <span class="param-item__type">{{ getParamTypeLabel(param.type) }}</span>
                  </div>
                  <div v-if="getParamDescription(param)" class="param-item__desc">{{ getParamDescription(param) }}</div>
                  <a-input-number
                    v-if="param.type === 'number' || param.type === 'integer' || param.type === 'percent'"
                    :value="templateParamValues[param.name]"
                    :min="param.min"
                    :max="param.max"
                    :step="param.step || 1"
                    :precision="param.type === 'integer' ? 0 : getParamPrecision(param)"
                    style="width: 100%"
                    @change="handleNumericParamChange(param, $event)"
                  />
                  <a-select
                    v-else-if="param.type === 'select'"
                    :value="templateParamValues[param.name]"
                    style="width: 100%"
                    @change="handleSelectParamChange(param, $event)"
                  >
                    <a-select-option
                      v-for="option in (param.options || [])"
                      :key="option.value"
                      :value="option.value">
                      {{ getOptionLabel(option) }}
                    </a-select-option>
                  </a-select>
                  <div v-else-if="param.type === 'boolean'" class="param-item__switch">
                    <a-switch
                      :checked="!!templateParamValues[param.name]"
                      @change="handleBooleanParamChange(param, $event)"
                    />
                    <span>{{ templateParamValues[param.name] ? $t('common.yes') : $t('common.no') }}</span>
                  </div>
                  <a-input
                    v-else
                    :value="templateParamValues[param.name]"
                    @input="handleTextParamChange(param, $event.target.value)"
                  />
                </div>
              </div>
              <div class="params-actions">
                <a-button @click="resetTemplateParams">
                  {{ $t('trading-assistant.editor.resetTemplateParams') }}
                </a-button>
                <a-button type="primary" @click="applySelectedTemplateToCode" :disabled="!templateDirty">
                  {{ $t('trading-assistant.editor.applyTemplateParams') }}
                </a-button>
              </div>
            </div>
            <a-empty v-else :description="$t('trading-assistant.editor.paramsEmpty')" />
          </a-tab-pane>

          <a-tab-pane key="ai" :tab="$t('trading-assistant.editor.aiTab')">
            <div class="ai-panel">
              <div class="panel-intro">
                <div class="panel-intro__title">
                  <a-icon type="robot" />
                  <span>{{ $t('trading-assistant.editor.aiGenerate') }}</span>
                </div>
                <div class="panel-intro__desc">{{ $t('trading-assistant.editor.aiHint') }}</div>
              </div>
              <div class="ai-suggestions">
                <a-tag
                  v-for="item in aiPromptSuggestions"
                  :key="item.id"
                  class="prompt-tag"
                  @click="applyPromptSuggestion(item.value)">
                  {{ item.label }}
                </a-tag>
              </div>
              <a-textarea
                v-model="aiPrompt"
                :placeholder="$t('trading-assistant.editor.aiPromptPlaceholder')"
                :rows="10"
                :auto-size="{ minRows: 8, maxRows: 16 }"
              />
              <a-button
                type="primary"
                block
                @click="handleAIGenerate"
                :loading="aiGenerating"
                size="large"
                style="margin-top: 10px;"
              >
                <a-icon type="thunderbolt" />
                {{ $t('trading-assistant.editor.aiGenerateBtn') }}
              </a-button>
              <div v-if="aiGenerating" class="ai-status">
                <a-icon type="loading" spin /> {{ $t('trading-assistant.editor.generating') }}
              </div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="docs" :tab="$t('trading-assistant.editor.docsTab')">
            <div class="docs-panel">
              <div class="panel-intro">
                <div class="panel-intro__title">{{ $t('trading-assistant.editor.docsIntroTitle') }}</div>
                <div class="panel-intro__desc">{{ $t('trading-assistant.editor.docsIntroDesc') }}</div>
              </div>
              <div class="docs-content" v-html="apiDocsHtml"></div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { message } from 'ant-design-vue'
import request from '@/utils/request'
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/python/python'
import 'codemirror/theme/monokai.css'
import 'codemirror/theme/eclipse.css'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/selection/active-line'
import {
  SCRIPT_TEMPLATE_CATALOG,
  getScriptTemplateByKey,
  buildTemplateCode,
  buildTemplateParamValues
} from './scriptTemplateCatalog'

const API_DOCS_MD = `
<h4>Strategy API Reference</h4>
<h5>Lifecycle Functions</h5>
<pre><code>def on_init(ctx):
    """Called once when strategy starts"""

def on_bar(ctx, bar):
    """Called on each new K-line bar"""
    # bar: { open, high, low, close, volume, timestamp }

def on_order_filled(ctx, order):
    """Called when an order is filled"""

def on_stop(ctx):
    """Called when strategy stops"""</code></pre>

<h5>Trading Actions</h5>
<pre><code>ctx.buy(price, amount)      # Buy / go long
ctx.sell(price, amount)     # Sell / reduce long / go short
ctx.close_position()        # Close current position
ctx.cancel_all_orders()     # Cancel pending orders</code></pre>

<h5>Context Properties</h5>
<pre><code>ctx.position       # { side, amount, entry_price, unrealized_pnl }
ctx.balance        # Available balance
ctx.equity         # Total equity
ctx.current_price  # Current market price
ctx.symbol         # Trading symbol
ctx.timeframe      # K-line timeframe</code></pre>

<h5>Data Access</h5>
<pre><code>ctx.bars(n=100)            # Get last N bars
ctx.param(name, default)   # Get strategy parameter
ctx.indicator(id, params)  # Call existing indicator
ctx.log(message)           # Write strategy log</code></pre>
`

export default {
  name: 'StrategyEditor',
  props: {
    value: { type: String, default: '' },
    isDark: { type: Boolean, default: false },
    userId: { type: [Number, String], default: 1 },
    visible: { type: Boolean, default: false },
    initialTemplateKey: { type: String, default: '' }
  },
  data () {
    return {
      activeTab: 'templates',
      aiPrompt: '',
      aiGenerating: false,
      verifying: false,
      editor: null,
      apiDocsHtml: API_DOCS_MD,
      templates: SCRIPT_TEMPLATE_CATALOG,
      selectedTemplateKey: '',
      templateParamValues: {},
      templateDirty: false,
      refreshTimer: null
    }
  },
  computed: {
    selectedTemplate () {
      return getScriptTemplateByKey(this.selectedTemplateKey)
    },
    aiPromptSuggestions () {
      return [
        {
          id: 'improve',
          label: this.$t('trading-assistant.editor.aiSuggestionImprove'),
          value: this.$t('trading-assistant.editor.aiSuggestionImprovePrompt')
        },
        {
          id: 'risk',
          label: this.$t('trading-assistant.editor.aiSuggestionRisk'),
          value: this.$t('trading-assistant.editor.aiSuggestionRiskPrompt')
        },
        {
          id: 'explain',
          label: this.$t('trading-assistant.editor.aiSuggestionExplain'),
          value: this.$t('trading-assistant.editor.aiSuggestionExplainPrompt')
        }
      ]
    }
  },
  mounted () {
    this.$nextTick(() => {
      this.initEditor()
      if (this.initialTemplateKey) {
        this.loadTemplate(this.initialTemplateKey, { focusParams: true, resetParams: true })
      } else if (!this.value) {
        this.$emit('input', this._getDefaultCode())
      }
    })
    window.addEventListener('resize', this.scheduleEditorRefresh)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.scheduleEditorRefresh)
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    if (this.editor) {
      if (typeof this.editor.toTextArea === 'function') {
        this.editor.toTextArea()
      }
      this.editor = null
    }
  },
  watch: {
    value (newVal) {
      if (this.editor && this.editor.getValue() !== newVal) {
        this.editor.setValue(newVal || '')
        this.scheduleEditorRefresh()
      }
    },
    isDark () {
      if (this.editor) {
        this.editor.setOption('theme', this.isDark ? 'monokai' : 'eclipse')
      }
      this.scheduleEditorRefresh()
    },
    visible (val) {
      if (val) {
        this.scheduleEditorRefresh()
      }
    },
    initialTemplateKey (key) {
      if (key && key !== this.selectedTemplateKey) {
        this.loadTemplate(key, { focusParams: true, resetParams: true })
      }
    }
  },
  methods: {
    initEditor () {
      if (!this.$refs.editorContainer) return
      this.editor = CodeMirror(this.$refs.editorContainer, {
        value: this.value || this._getDefaultCode(),
        mode: 'python',
        theme: this.isDark ? 'monokai' : 'eclipse',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        styleActiveLine: true,
        tabSize: 4,
        indentUnit: 4,
        indentWithTabs: false,
        lineWrapping: false,
        viewportMargin: Infinity,
        gutters: ['CodeMirror-linenumbers']
      })
      this.editor.on('change', () => {
        this.$emit('input', this.editor.getValue())
      })
      this.scheduleEditorRefresh()
    },

    scheduleEditorRefresh () {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer)
      }
      this.refreshTimer = setTimeout(() => {
        if (this.editor) {
          this.editor.refresh()
        }
      }, 60)
    },

    _getDefaultCode () {
      return `"""
My Custom Strategy
"""

def on_init(ctx):
    # Initialize strategy parameters
    pass

def on_bar(ctx, bar):
    # Core trading logic, called on each K-line bar
    # bar: { open, high, low, close, volume, timestamp }
    price = bar['close']

    bars = ctx.bars(20)
    if len(bars) < 20:
        return

    avg = sum(b['close'] for b in bars) / len(bars)

    if price > avg and not ctx.position:
        ctx.buy(price, ctx.equity * 0.9 / price)
        ctx.log(f"BUY at {price}")

    elif price < avg and ctx.position:
        ctx.close_position()
        ctx.log(f"SELL at {price}")
`
    },

    loadTemplate (key, { focusParams = false, resetParams = true } = {}) {
      const template = getScriptTemplateByKey(key)
      if (!template) return
      this.selectedTemplateKey = key
      if (resetParams || !this.templateParamValues || Object.keys(this.templateParamValues).length === 0) {
        this.templateParamValues = buildTemplateParamValues(template)
      }
      this.templateDirty = true
      this.applySelectedTemplateToCode({ silent: true })
      if (focusParams) {
        this.activeTab = 'params'
      }
      if (!this.aiPrompt.trim()) {
        this.aiPrompt = this.$t('trading-assistant.editor.aiPromptTemplateHint') + ' ' + this.$t(`trading-assistant.template.${template.key}`)
      }
      this.scheduleEditorRefresh()
    },

    getCode () {
      return this.editor ? this.editor.getValue() : this.value
    },

    setCode (code) {
      if (this.editor) {
        if (this.editor.getValue() !== code) {
          this.editor.setValue(code)
        } else {
          this.$emit('input', code)
        }
      } else {
        this.$emit('input', code)
      }
      this.scheduleEditorRefresh()
    },

    applySelectedTemplateToCode ({ silent = false } = {}) {
      if (!this.selectedTemplate) return
      const code = buildTemplateCode(this.selectedTemplate, this.templateParamValues)
      this.setCode(code)
      this.templateDirty = false
      this.$emit('template-change', {
        key: this.selectedTemplateKey,
        params: { ...this.templateParamValues }
      })
      if (!silent) {
        message.success(this.$t('trading-assistant.editor.templateApplied'))
      }
    },

    resetTemplateParams () {
      if (!this.selectedTemplate) return
      this.templateParamValues = buildTemplateParamValues(this.selectedTemplate)
      this.templateDirty = true
      this.applySelectedTemplateToCode({ silent: false })
    },

    getParamLabel (param) {
      const key = `trading-assistant.templateParam.${param.name}.label`
      const value = this.$t(key)
      return value === key ? param.name : value
    },

    getParamDescription (param) {
      const key = `trading-assistant.templateParam.${param.name}.desc`
      const value = this.$t(key)
      return value === key ? '' : value
    },

    getParamTypeLabel (type) {
      return this.$t(`trading-assistant.editor.paramType.${type}`)
    },

    getOptionLabel (option) {
      if (!option) return ''
      if (option.labelKey) {
        const translated = this.$t(option.labelKey)
        if (translated !== option.labelKey) return translated
      }
      return option.label || option.value
    },

    getParamPrecision (param) {
      if (param.type === 'integer') return 0
      const step = param.step
      if (!step || Number.isInteger(step)) return 0
      const stepText = String(step)
      const parts = stepText.split('.')
      return parts[1] ? parts[1].length : 0
    },

    handleNumericParamChange (param, value) {
      const normalized = value === '' || value === null || value === undefined
        ? param.default
        : (param.type === 'integer' ? parseInt(value, 10) : Number(value))
      this.$set(this.templateParamValues, param.name, normalized)
      this.templateDirty = true
    },

    handleSelectParamChange (param, value) {
      this.$set(this.templateParamValues, param.name, value)
      this.templateDirty = true
    },

    handleBooleanParamChange (param, value) {
      this.$set(this.templateParamValues, param.name, !!value)
      this.templateDirty = true
    },

    handleTextParamChange (param, value) {
      this.$set(this.templateParamValues, param.name, value)
      this.templateDirty = true
    },

    applyPromptSuggestion (value) {
      this.aiPrompt = value
    },

    async handleVerify () {
      this.verifying = true
      try {
        const code = this.getCode()
        const res = await request({
          url: '/api/strategies/verify-code',
          method: 'post',
          data: { code, user_id: this.userId }
        })
        if (res && res.success) {
          message.success(this.$t('trading-assistant.editor.verifySuccess'))
        } else {
          message.error((res && (res.msg || res.message)) || this.$t('trading-assistant.editor.verifyFailed'))
        }
      } catch (e) {
        message.error(this.$t('trading-assistant.editor.verifyFailed') + ': ' + (e.message || ''))
      } finally {
        this.verifying = false
      }
    },

    async handleAIGenerate () {
      if (!this.aiPrompt.trim()) {
        message.warning(this.$t('trading-assistant.editor.aiPromptRequired'))
        return
      }
      this.aiGenerating = true
      try {
        const res = await request({
          url: '/api/strategies/ai-generate',
          method: 'post',
          data: { prompt: this.aiPrompt, user_id: this.userId }
        })
        if (res && res.code) {
          this.setCode(res.code)
          message.success(this.$t('trading-assistant.editor.aiGenerateSuccess'))
        } else {
          message.error((res && (res.msg || res.message)) || this.$t('trading-assistant.editor.aiGenerateFailed'))
        }
      } catch (e) {
        message.error((e && e.message) || this.$t('trading-assistant.editor.aiGenerateFailed'))
      } finally {
        this.aiGenerating = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.strategy-editor {
  width: 100%;
}

.editor-layout {
  min-height: 450px;
}

.code-section {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
}

.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.section-title {
  font-weight: 600;
  font-size: 14px;

  .anticon {
    margin-right: 6px;
  }
}

.current-template-tag {
  margin-right: 0;
}

.verify-btn {
  color: #52c41a;
  font-weight: 600;
}

.code-editor-container {
  height: 420px;
  width: 100%;
  display: flex;
  flex-direction: column;

  /deep/ .CodeMirror {
    flex: 1;
    height: 100%;
    font-family: 'Courier New', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 13px;
    line-height: 1.6;
    background: #ffffff;
  }

  /deep/ .CodeMirror-scroll {
    min-height: 100%;
    overflow-x: auto !important;
    overflow-y: auto !important;
  }

  /deep/ .CodeMirror-gutters {
    min-width: 48px;
    border-right: 1px solid #e8e8e8;
    background: linear-gradient(to right, #fafafa 0%, #f5f5f5 100%);
  }

  /deep/ .CodeMirror-linenumbers {
    width: 44px !important;
  }

  /deep/ .CodeMirror-linenumber {
    min-width: 36px;
    padding: 0 8px 0 0;
    text-align: right;
    color: #999;
    font-size: 12px;
  }

  /deep/ .CodeMirror-sizer {
    margin-left: 0 !important;
    min-height: 100% !important;
  }

  /deep/ .CodeMirror-lines {
    padding: 12px 0;
  }

  /deep/ .CodeMirror pre.CodeMirror-line,
  /deep/ .CodeMirror pre.CodeMirror-line-like {
    padding: 0 12px 0 12px;
  }

  /deep/ .CodeMirror-cursor {
    border-left: 2px solid #1890ff;
  }
}

.side-tabs {
  height: 100%;

  /deep/ .ant-tabs-content {
    height: calc(100% - 40px);
    overflow-y: auto;
  }
}

.panel-intro {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
}

.panel-intro__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.panel-intro__desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #8c8c8c;
}

.template-list {
  padding: 4px 0;
}

.template-item {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover,
  &.active {
    border-color: #1890ff;
    background: #fafafa;
  }

  .tpl-header {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
  }

  .tpl-icon {
    font-size: 16px;
    margin-right: 8px;
  }

  .tpl-name {
    font-weight: 600;
    font-size: 14px;
  }

  .tpl-desc {
    font-size: 12px;
    color: #888;
    margin: 0 0 4px;
  }

  .tpl-use-btn {
    padding: 0;
    font-size: 12px;
  }
}

.params-tip {
  margin-bottom: 12px;
}

.param-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-item {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fff;
}

.param-item__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.param-item__label {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}

.param-item__type {
  font-size: 11px;
  color: #8c8c8c;
}

.param-item__desc {
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #8c8c8c;
}

.param-item__switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.params-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.ai-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.prompt-tag {
  cursor: pointer;
}

.ai-status {
  margin-top: 8px;
  color: #1890ff;
  font-size: 13px;
  text-align: center;
}

.docs-content {
  font-size: 13px;
  line-height: 1.6;

  /deep/ h4 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  /deep/ h5 {
    font-size: 14px;
    font-weight: 600;
    margin: 16px 0 8px;
    color: #1890ff;
  }

  /deep/ pre {
    background: #f6f8fa;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 12px;
    line-height: 1.5;
  }

  /deep/ code {
    font-family: 'Courier New', Consolas, monospace;
  }
}

.theme-dark {
  .code-section {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .section-header {
    background: #1a1e28;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .section-title {
    color: #e0e6ed;
  }

  .side-tabs {
    /deep/ .ant-tabs-nav .ant-tabs-tab {
      color: rgba(255, 255, 255, 0.55);

      &:hover {
        color: rgba(255, 255, 255, 0.85);
      }

      &.ant-tabs-tab-active .ant-tabs-tab-btn {
        color: #1890ff;
      }
    }

    /deep/ .ant-tabs-bar {
      border-bottom-color: rgba(255, 255, 255, 0.08);
    }
  }

  .panel-intro {
    background: #1a1e28;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .panel-intro__title,
  .param-item__label {
    color: #e0e6ed;
  }

  .panel-intro__desc,
  .param-item__desc,
  .param-item__type {
    color: rgba(255, 255, 255, 0.45);
  }

  .template-item,
  .param-item {
    border-color: rgba(255, 255, 255, 0.08);
    background: #1a1e28;
  }

  .template-item:hover,
  .template-item.active {
    border-color: #177ddc;
    background: rgba(23, 125, 220, 0.06);
  }

  .tpl-name {
    color: #e0e6ed;
  }

  .tpl-desc {
    color: rgba(255, 255, 255, 0.4);
  }

  .prompt-tag {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }

  /deep/ textarea.ant-input,
  /deep/ .ant-input,
  /deep/ .ant-input-number,
  /deep/ .ant-input-number-input,
  /deep/ .ant-select-selection,
  /deep/ .ant-select-selection--single {
    background: #141821 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: #d1d4dc !important;
  }

  /deep/ .ant-select-selection-selected-value,
  /deep/ .ant-select-selection-placeholder {
    color: #d1d4dc !important;
  }

  .ai-status {
    color: #40a9ff;
  }

  .docs-content {
    color: rgba(255, 255, 255, 0.75);
  }

  .docs-content /deep/ h4 {
    color: #e0e6ed;
  }

  .docs-content /deep/ h5 {
    color: #40a9ff;
  }

  .docs-content /deep/ pre {
    background: #141821;
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .code-editor-container {
    /deep/ .CodeMirror {
      background: #0f141c;
      color: #d1d4dc;
    }

    /deep/ .CodeMirror-gutters {
      border-right-color: rgba(255, 255, 255, 0.08);
      background: linear-gradient(to right, #151922 0%, #1a1e28 100%);
    }

    /deep/ .CodeMirror-linenumber {
      color: rgba(255, 255, 255, 0.32);
    }
  }
}
</style>
