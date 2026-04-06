<template>
  <div class="strategy-logs strategy-tab-pane-inner" :class="{ 'theme-dark': isDark }">
    <div class="logs-toolbar">
      <div class="toolbar-left">
        <a-radio-group v-model="filterLevel" size="small" button-style="solid">
          <a-radio-button value="all">All</a-radio-button>
          <a-radio-button value="trade">
            <a-badge :count="countByLevel('trade')" :overflow-count="99" :offset="[6, -2]">
              {{ $t('trading-assistant.logs.level.trade') }}
            </a-badge>
          </a-radio-button>
          <a-radio-button value="signal">{{ $t('trading-assistant.logs.level.signal') }}</a-radio-button>
          <a-radio-button value="error">{{ $t('trading-assistant.logs.level.error') }}</a-radio-button>
        </a-radio-group>
      </div>
      <div class="toolbar-right">
        <a-switch
          :checked="autoRefresh"
          @change="toggleAutoRefresh"
          size="small"
        />
        <span class="auto-refresh-label">{{ $t('trading-assistant.logs.autoRefresh') }}</span>
      </div>
    </div>

    <div class="logs-container custom-scrollbar" ref="logsContainer">
      <div v-if="filteredLogs.length === 0" class="logs-empty">
        <a-icon type="file-text" style="font-size: 32px; color: #ccc;" />
        <p>{{ $t('trading-assistant.logs.noLogs') }}</p>
      </div>
      <div
        v-for="(log, idx) in filteredLogs"
        :key="idx"
        class="log-entry"
        :class="'level-' + log.level"
      >
        <span class="log-time">{{ formatTime(log.timestamp) }}</span>
        <a-tag :color="getLevelColor(log.level)" size="small" class="log-level">
          {{ getLevelText(log.level) }}
        </a-tag>
        <span class="log-message">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import request from '@/utils/request'

export default {
  name: 'StrategyLogs',
  props: {
    strategyId: { type: [Number, String], default: null },
    isDark: { type: Boolean, default: false }
  },
  data () {
    return {
      logs: [],
      filterLevel: 'all',
      autoRefresh: false,
      refreshTimer: null,
      loading: false
    }
  },
  computed: {
    filteredLogs () {
      if (this.filterLevel === 'all') return this.logs
      return this.logs.filter(l => l.level === this.filterLevel)
    }
  },
  watch: {
    strategyId: {
      handler (val) {
        if (val) this.loadLogs()
      },
      immediate: true
    }
  },
  beforeDestroy () {
    this.stopAutoRefresh()
  },
  methods: {
    async loadLogs () {
      if (!this.strategyId) return
      this.loading = true
      try {
        const res = await request({
          url: '/api/strategies/logs',
          method: 'get',
          params: { id: this.strategyId, limit: 200 }
        })
        if (res && res.data) {
          this.logs = res.data
          this.$nextTick(() => this.scrollToBottom())
        }
      } catch (e) {
        console.warn('Load logs failed:', e)
      } finally {
        this.loading = false
      }
    },

    toggleAutoRefresh (checked) {
      this.autoRefresh = checked
      if (checked) {
        this.refreshTimer = setInterval(() => this.loadLogs(), 5000)
      } else {
        this.stopAutoRefresh()
      }
    },

    stopAutoRefresh () {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },

    scrollToBottom () {
      const el = this.$refs.logsContainer
      if (el) el.scrollTop = el.scrollHeight
    },

    countByLevel (level) {
      return this.logs.filter(l => l.level === level).length
    },

    formatTime (ts) {
      if (!ts) return ''
      try {
        const d = new Date(ts)
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      } catch {
        return ts
      }
    },

    getLevelColor (level) {
      const map = { info: 'blue', warn: 'orange', error: 'red', trade: 'green', signal: 'purple' }
      return map[level] || 'default'
    },

    getLevelText (level) {
      const key = `trading-assistant.logs.level.${level}`
      const translated = this.$t(key)
      return translated !== key ? translated : level
    }
  }
}
</script>

<style lang="less" scoped>
.strategy-logs {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.logs-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  margin-bottom: 8px;

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 6px;

    .auto-refresh-label {
      font-size: 12px;
      color: #999;
    }
  }
}

.logs-container {
  flex: 1;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 8px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.7;
  background: #fafafa;
}

.logs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #ccc;

  p {
    margin-top: 8px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 3px;

  &:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  &.level-error {
    background: rgba(255, 77, 79, 0.04);
  }

  &.level-trade {
    background: rgba(82, 196, 26, 0.04);
  }
}

.log-time {
  color: #999;
  white-space: nowrap;
  font-size: 11px;
  min-width: 65px;
}

.log-level {
  flex-shrink: 0;
  font-size: 10px;
}

.log-message {
  flex: 1;
  word-break: break-all;
}

.theme-dark {
  .logs-toolbar {
    .toolbar-right .auto-refresh-label {
      color: rgba(255, 255, 255, 0.4);
    }

    /deep/ .ant-radio-group .ant-radio-button-wrapper {
      background: #1c1c1c;
      border-color: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.55);

      &:hover {
        color: #40a9ff;
      }

      &.ant-radio-button-wrapper-checked {
        background: #1890ff;
        border-color: #1890ff;
        color: #fff;
      }
    }
  }

  .logs-container {
    background: #141414;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .logs-empty {
    color: rgba(255, 255, 255, 0.25);

    .anticon {
      color: rgba(255, 255, 255, 0.15) !important;
    }

    p {
      color: rgba(255, 255, 255, 0.3);
    }
  }

  .log-entry {
    &:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    &.level-error {
      background: rgba(255, 77, 79, 0.06);
    }

    &.level-trade {
      background: rgba(82, 196, 26, 0.06);
    }
  }

  .log-time {
    color: rgba(255, 255, 255, 0.3);
  }

  .log-message {
    color: rgba(255, 255, 255, 0.75);
  }
}
</style>
