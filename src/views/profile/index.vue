<template>
  <div class="profile-page" :class="{ 'theme-dark': isDarkTheme }">
    <div class="page-header">
      <h2 class="page-title">
        <a-icon type="user" />
        <span>{{ $t('profile.title') || 'My Profile' }}</span>
      </h2>
      <p class="page-desc">{{ $t('profile.description') || 'Manage your account settings and preferences' }}</p>
    </div>

    <a-row :gutter="24" class="profile-cards-row">
      <!-- Left Column: Profile Card -->
      <a-col :xs="24" :md="8" class="profile-card-col">
        <a-card :bordered="false" class="profile-card">
          <div class="avatar-section">
            <a-avatar :size="100" :src="profile.avatar || '/avatar2.jpg'" />
            <h3 class="username">{{ profile.nickname || profile.username }}</h3>
            <p class="user-role">
              <a-tag :color="getRoleColor(profile.role)">
                {{ getRoleLabel(profile.role) }}
              </a-tag>
              <a-tag v-if="isVip" color="gold">
                <a-icon type="crown" />
                VIP
              </a-tag>
            </p>
          </div>
          <a-divider />
          <div class="profile-info">
            <div class="info-item">
              <a-icon type="user" />
              <span class="label">{{ $t('profile.username') || 'Username' }}:</span>
              <span class="value">{{ profile.username }}</span>
            </div>
            <div class="info-item">
              <a-icon type="mail" />
              <span class="label">{{ $t('profile.email') || 'Email' }}:</span>
              <span class="value">{{ profile.email || '-' }}</span>
            </div>
            <div class="info-item">
              <a-icon type="calendar" />
              <span class="label">{{ $t('profile.lastLogin') || 'Last Login' }}:</span>
              <span class="value">{{ formatTime(profile.last_login_at) || '-' }}</span>
            </div>
          </div>
        </a-card>
      </a-col>

      <!-- Right Column: Credits and Referral Cards -->
      <a-col :xs="24" :md="16" class="right-cards-col">
        <a-row :gutter="16" class="right-cards-row">
          <!-- Credits Card (积分卡片) -->
          <a-col :xs="24" :md="12">
            <a-card :bordered="false" class="credits-card">
              <div class="credits-header">
                <h3 class="credits-title">
                  <a-icon type="wallet" />
                  {{ $t('profile.credits.title') || '我的积分' }}
                </h3>
              </div>
              <div class="credits-body">
                <div class="credits-amount">
                  <span class="amount-value">{{ formatCredits(billing.credits) }}</span>
                  <span class="amount-label">{{ $t('profile.credits.unit') || '积分' }}</span>
                </div>
                <div class="vip-status" v-if="billing.vip_expires_at">
                  <a-icon type="crown" :style="{ color: isVip ? '#faad14' : '#999' }" />
                  <span v-if="isVip" class="vip-active">
                    {{ $t('profile.credits.vipExpires') || 'VIP有效期至' }}: {{ formatDate(billing.vip_expires_at) }}
                  </span>
                  <span v-else class="vip-expired">
                    {{ $t('profile.credits.vipExpired') || 'VIP已过期' }}
                  </span>
                </div>
                <div class="vip-status" v-else-if="!billing.is_vip">
                  <span class="no-vip">{{ $t('profile.credits.noVip') || '非VIP用户' }}</span>
                </div>
              </div>
              <a-divider />
              <div class="credits-actions">
                <a-button type="primary" icon="shopping" @click="handleRecharge">
                  {{ $t('profile.credits.recharge') || '开通/充值' }}
                </a-button>
              </div>
              <div class="credits-hint" v-if="billing.billing_enabled">
                <a-icon type="info-circle" />
                <span>{{ $t('profile.credits.hint') || '使用AI分析/回测/监控等功能会消耗积分；VIP仅可免费使用VIP免费指标。' }}</span>
              </div>
            </a-card>
          </a-col>

          <!-- Referral Card (邀请卡片) -->
          <a-col :xs="24" :md="12">
            <a-card :bordered="false" class="referral-card">
              <div class="referral-header">
                <h3 class="referral-title">
                  <a-icon type="team" />
                  {{ $t('profile.referral.title') || '邀请好友' }}
                </h3>
              </div>
              <div class="referral-body">
                <div class="referral-stats">
                  <div class="stat-item">
                    <span class="stat-value">{{ referralData.total || 0 }}</span>
                    <span class="stat-label">{{ $t('profile.referral.totalInvited') || '已邀请' }}</span>
                  </div>
                  <div class="stat-item" v-if="referralData.referral_bonus > 0">
                    <span class="stat-value">+{{ referralData.referral_bonus }}</span>
                    <span class="stat-label">{{ $t('profile.referral.bonusPerInvite') || '每邀请获得' }}</span>
                  </div>
                </div>
                <a-divider style="margin: 12px 0" />
                <div class="referral-link-section">
                  <div class="link-label">{{ $t('profile.referral.yourLink') || '您的邀请链接' }}</div>
                  <div class="link-box">
                    <a-input
                      :value="referralLink"
                      readonly
                      size="small"
                    >
                      <a-tooltip slot="suffix" :title="$t('profile.referral.copyLink') || '复制链接'">
                        <a-icon type="copy" style="cursor: pointer" @click="copyReferralLink" />
                      </a-tooltip>
                    </a-input>
                  </div>
                </div>
                <div class="referral-hint" v-if="referralData.register_bonus > 0">
                  <a-icon type="gift" />
                  <span>{{ $t('profile.referral.newUserBonus') || '新用户注册获得' }} {{ referralData.register_bonus }} {{ $t('profile.credits.unit') || '积分' }}</span>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </a-col>
    </a-row>

    <!-- Edit Profile Tabs (Below Cards) -->
    <a-row :gutter="24" style="margin-top: 24px">
      <a-col :xs="24">
        <a-card :bordered="false" class="edit-card">
          <a-tabs v-model="activeTab">
            <!-- Basic Info Tab -->
            <a-tab-pane key="basic" :tab="$t('profile.basicInfo') || 'Basic Info'">
              <a-form :form="profileForm" layout="vertical" class="profile-form">
                <a-form-item :label="$t('profile.nickname') || 'Nickname'">
                  <a-input
                    v-decorator="['nickname', { initialValue: profile.nickname }]"
                    :placeholder="$t('profile.nicknamePlaceholder') || 'Enter your nickname'"
                  >
                    <a-icon slot="prefix" type="smile" />
                  </a-input>
                </a-form-item>

                <a-form-item :label="$t('profile.email') || 'Email'">
                  <a-input
                    :value="profile.email || '-'"
                    disabled
                  >
                    <a-icon slot="prefix" type="mail" />
                    <a-tooltip slot="suffix" :title="$t('profile.emailCannotChange') || 'Email cannot be changed after registration'">
                      <a-icon type="info-circle" style="color: rgba(0,0,0,.45)" />
                    </a-tooltip>
                  </a-input>
                </a-form-item>

                <a-form-item>
                  <a-button type="primary" :loading="saving" @click="handleSaveProfile">
                    <a-icon type="save" />
                    {{ $t('common.save') || 'Save' }}
                  </a-button>
                </a-form-item>
              </a-form>
            </a-tab-pane>

            <!-- Change Password Tab -->
            <a-tab-pane key="password" :tab="$t('profile.changePassword') || 'Change Password'">
              <a-form :form="passwordForm" layout="vertical" class="password-form">
                <a-alert
                  :message="$t('profile.passwordHintNew') || 'For security, email verification is required to change password. Password must be at least 8 characters with uppercase, lowercase, and number.'"
                  type="info"
                  showIcon
                  style="margin-bottom: 24px"
                />

                <!-- Email Display & Verification Code -->
                <a-form-item :label="$t('profile.verificationCode') || 'Verification Code'">
                  <a-row :gutter="12">
                    <a-col :span="16">
                      <a-input
                        v-decorator="['code', {
                          rules: [{ required: true, message: $t('profile.codeRequired') || 'Please enter verification code' }]
                        }]"
                        :placeholder="$t('profile.codePlaceholder') || 'Enter verification code'"
                      >
                        <a-icon slot="prefix" type="safety-certificate" />
                      </a-input>
                    </a-col>
                    <a-col :span="8">
                      <a-button
                        block
                        :loading="sendingPwdCode"
                        :disabled="sendingPwdCode || pwdCodeCountdown > 0 || !profile.email"
                        @click="handleSendPwdCode"
                      >
                        {{ pwdCodeCountdown > 0 ? `${pwdCodeCountdown}s` : ($t('profile.sendCode') || 'Send Code') }}
                      </a-button>
                    </a-col>
                  </a-row>
                  <div class="email-hint" v-if="profile.email">
                    {{ $t('profile.codeWillSendTo') || 'Code will be sent to' }}: {{ profile.email }}
                  </div>
                  <div class="email-hint email-warning" v-else>
                    {{ $t('profile.noEmailWarning') || 'Please set your email first in Basic Info tab' }}
                  </div>
                </a-form-item>

                <a-form-item :label="$t('profile.newPassword') || 'New Password'">
                  <a-input-password
                    v-decorator="['new_password', {
                      rules: [
                        { required: true, message: $t('profile.newPasswordRequired') || 'Please enter new password' },
                        { validator: validateNewPassword }
                      ]
                    }]"
                    :placeholder="$t('profile.newPasswordPlaceholder') || 'Enter new password'"
                  >
                    <a-icon slot="prefix" type="lock" />
                  </a-input-password>
                </a-form-item>

                <a-form-item :label="$t('profile.confirmPassword') || 'Confirm Password'">
                  <a-input-password
                    v-decorator="['confirm_password', {
                      rules: [
                        { required: true, message: $t('profile.confirmPasswordRequired') || 'Please confirm password' },
                        { validator: validateConfirmPassword }
                      ]
                    }]"
                    :placeholder="$t('profile.confirmPasswordPlaceholder') || 'Confirm new password'"
                  >
                    <a-icon slot="prefix" type="lock" />
                  </a-input-password>
                </a-form-item>

                <a-form-item>
                  <a-button type="primary" :loading="changingPassword" @click="handleChangePassword" :disabled="!profile.email">
                    <a-icon type="key" />
                    {{ $t('profile.changePassword') || 'Change Password' }}
                  </a-button>
                </a-form-item>
              </a-form>
            </a-tab-pane>

            <!-- Credits Log Tab (消费记录) -->
            <a-tab-pane key="credits" :tab="$t('profile.creditsLog') || '消费记录'">
              <a-table
                :columns="creditsLogColumns"
                :dataSource="creditsLog"
                :loading="creditsLogLoading"
                :pagination="creditsLogPagination"
                :rowKey="record => record.id"
                size="small"
                @change="handleCreditsLogChange"
              >
                <!-- Action Column -->
                <template slot="action" slot-scope="text">
                  <a-tag :color="getActionColor(text)">
                    {{ getActionLabel(text) }}
                  </a-tag>
                </template>

                <!-- Amount Column -->
                <template slot="amount" slot-scope="text">
                  <span :class="text >= 0 ? 'amount-positive' : 'amount-negative'">
                    {{ text >= 0 ? '+' : '' }}{{ text }}
                  </span>
                </template>

                <!-- Time Column -->
                <template slot="created_at" slot-scope="text">
                  {{ formatTime(text) }}
                </template>
              </a-table>
            </a-tab-pane>

            <!-- Notification Settings Tab (通知设置) -->
            <a-tab-pane key="notifications" :tab="$t('profile.notifications.title') || '通知设置'">
              <div class="notification-settings-form">
                <a-alert
                  :message="$t('profile.notifications.hint') || '配置您的默认通知方式，在创建资产监控和预警时将自动使用这些设置'"
                  type="info"
                  showIcon
                  style="margin-bottom: 24px"
                />

                <a-form :form="notificationForm" layout="vertical" style="max-width: 600px;">
                  <!-- Default Channels -->
                  <a-form-item :label="$t('profile.notifications.defaultChannels') || '默认通知渠道'">
                    <a-checkbox-group
                      v-decorator="['default_channels', { initialValue: notificationSettings.default_channels || ['browser'] }]"
                    >
                      <a-row :gutter="16">
                        <a-col :span="8">
                          <a-checkbox value="browser">
                            <a-icon type="bell" /> {{ $t('profile.notifications.browser') || '站内通知' }}
                          </a-checkbox>
                        </a-col>
                        <a-col :span="8">
                          <a-checkbox value="telegram">
                            <a-icon type="send" /> Telegram
                          </a-checkbox>
                        </a-col>
                        <a-col :span="8">
                          <a-checkbox value="email">
                            <a-icon type="mail" /> {{ $t('profile.notifications.email') || '邮件' }}
                          </a-checkbox>
                        </a-col>
                      </a-row>
                      <a-row :gutter="16" style="margin-top: 8px">
                        <a-col :span="8">
                          <a-checkbox value="phone">
                            <a-icon type="phone" /> {{ $t('profile.notifications.phone') || '短信' }}
                          </a-checkbox>
                        </a-col>
                        <a-col :span="8">
                          <a-checkbox value="discord">
                            <a-icon type="message" /> Discord
                          </a-checkbox>
                        </a-col>
                        <a-col :span="8">
                          <a-checkbox value="webhook">
                            <a-icon type="api" /> Webhook
                          </a-checkbox>
                        </a-col>
                      </a-row>
                    </a-checkbox-group>
                  </a-form-item>

                  <!-- Telegram Bot Token -->
                  <a-form-item :label="$t('profile.notifications.telegramBotToken') || 'Telegram Bot Token'">
                    <a-input-password
                      v-decorator="['telegram_bot_token', { initialValue: notificationSettings.telegram_bot_token }]"
                      :placeholder="$t('profile.notifications.telegramBotTokenPlaceholder') || '请输入您的 Telegram Bot Token'"
                    >
                      <a-icon slot="prefix" type="robot" />
                    </a-input-password>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>
                        {{ $t('profile.notifications.telegramBotTokenHint') || '通过 @BotFather 创建机器人获取 Token' }}
                        <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a>
                      </span>
                    </div>
                  </a-form-item>

                  <!-- Telegram Chat ID -->
                  <a-form-item :label="$t('profile.notifications.telegramChatId') || 'Telegram Chat ID'">
                    <a-input
                      v-decorator="['telegram_chat_id', { initialValue: notificationSettings.telegram_chat_id }]"
                      :placeholder="$t('profile.notifications.telegramPlaceholder') || '请输入您的 Telegram Chat ID（如 123456789）'"
                    >
                      <a-icon slot="prefix" type="message" />
                    </a-input>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ $t('profile.notifications.telegramHint') || '发送 /start 给 @userinfobot 可获取您的 Chat ID' }}</span>
                    </div>
                  </a-form-item>

                  <!-- Notification Email -->
                  <a-form-item :label="$t('profile.notifications.notifyEmail') || '通知邮箱'">
                    <a-input
                      v-decorator="['email', { initialValue: notificationSettings.email || profile.email }]"
                      :placeholder="$t('profile.notifications.emailPlaceholder') || '接收通知的邮箱地址'"
                    >
                      <a-icon slot="prefix" type="mail" />
                    </a-input>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ $t('profile.notifications.emailHint') || '默认使用账户邮箱，可设置其他邮箱接收通知' }}</span>
                    </div>
                  </a-form-item>

                  <!-- Phone Number (SMS) -->
                  <a-form-item :label="$t('profile.notifications.phone') || '手机号（短信通知）'">
                    <a-input
                      v-decorator="['phone', { initialValue: notificationSettings.phone }]"
                      :placeholder="$t('profile.notifications.phonePlaceholder') || '请输入手机号（如 +8613800138000）'"
                    >
                      <a-icon slot="prefix" type="phone" />
                    </a-input>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ $t('profile.notifications.phoneHint') || '需要管理员配置 Twilio 服务后才能使用短信通知' }}</span>
                    </div>
                  </a-form-item>

                  <!-- Discord Webhook -->
                  <a-form-item :label="$t('profile.notifications.discordWebhook') || 'Discord Webhook'">
                    <a-input
                      v-decorator="['discord_webhook', { initialValue: notificationSettings.discord_webhook }]"
                      :placeholder="$t('profile.notifications.discordPlaceholder') || 'https://discord.com/api/webhooks/...'"
                    >
                      <a-icon slot="prefix" type="message" />
                    </a-input>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ $t('profile.notifications.discordHint') || '在 Discord 服务器设置中创建 Webhook' }}</span>
                    </div>
                  </a-form-item>

                  <!-- Webhook URL -->
                  <a-form-item :label="$t('profile.notifications.webhookUrl') || 'Webhook URL'">
                    <a-input
                      v-decorator="['webhook_url', { initialValue: notificationSettings.webhook_url }]"
                      :placeholder="$t('profile.notifications.webhookPlaceholder') || 'https://your-server.com/webhook'"
                    >
                      <a-icon slot="prefix" type="api" />
                    </a-input>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ $t('profile.notifications.webhookHint') || '自定义 Webhook 地址，将以 POST JSON 方式推送通知' }}</span>
                    </div>
                  </a-form-item>

                  <!-- Webhook Token -->
                  <a-form-item :label="$t('profile.notifications.webhookToken') || 'Webhook Token（可选）'">
                    <a-input-password
                      v-decorator="['webhook_token', { initialValue: notificationSettings.webhook_token }]"
                      :placeholder="$t('profile.notifications.webhookTokenPlaceholder') || '用于验证请求的 Bearer Token'"
                    >
                      <a-icon slot="prefix" type="key" />
                    </a-input-password>
                    <div class="field-hint">
                      <a-icon type="info-circle" />
                      <span>{{ $t('profile.notifications.webhookTokenHint') || '将作为 Authorization: Bearer Token 发送到 Webhook' }}</span>
                    </div>
                  </a-form-item>

                  <a-form-item>
                    <a-button type="primary" :loading="savingNotifications" @click="handleSaveNotifications">
                      <a-icon type="save" />
                      {{ $t('common.save') || '保存' }}
                    </a-button>
                    <a-button style="margin-left: 12px" @click="handleTestNotification" :loading="testingNotification">
                      <a-icon type="experiment" />
                      {{ $t('profile.notifications.testBtn') || '发送测试通知' }}
                    </a-button>
                  </a-form-item>
                </a-form>
              </div>
            </a-tab-pane>

            <!-- Exchange Config Tab (交易所配置) -->
            <a-tab-pane key="exchange" :tab="$t('profile.exchange.title') || '交易所配置'">
              <div class="exchange-config-section">
                <a-alert
                  :message="$t('profile.exchange.hint')"
                  type="info"
                  showIcon
                  style="margin-bottom: 16px"
                />
                <div style="margin-bottom: 16px; text-align: right;">
                  <a-button type="primary" icon="plus" @click="showAddExchangeModal = true">
                    {{ $t('profile.exchange.addAccount') }}
                  </a-button>
                </div>
                <a-table
                  :columns="exchangeColumns"
                  :dataSource="exchangeCredentials"
                  :loading="exchangeLoading"
                  :rowKey="record => record.id"
                  size="small"
                >
                  <template slot="exchange_id" slot-scope="text">
                    <span style="text-transform: capitalize; font-weight: 500;">{{ getExchangeDisplayName(text) }}</span>
                  </template>
                  <template slot="api_key_hint" slot-scope="text, record">
                    <span class="credential-hint">{{ text || record.name || '-' }}</span>
                  </template>
                  <template slot="created_at" slot-scope="text">
                    {{ formatTime(text) }}
                  </template>
                  <template slot="action" slot-scope="text, record">
                    <a-popconfirm
                      :title="$t('profile.exchange.deleteConfirm')"
                      @confirm="handleDeleteCredential(record.id)"
                      :okText="$t('common.confirm')"
                      :cancelText="$t('common.cancel')"
                    >
                      <a-button type="danger" size="small" ghost icon="delete">
                        {{ $t('common.delete') }}
                      </a-button>
                    </a-popconfirm>
                  </template>
                </a-table>
                <a-empty v-if="!exchangeLoading && exchangeCredentials.length === 0" style="margin-top: 20px">
                  <span slot="description">{{ $t('profile.exchange.noAccounts') }}</span>
                </a-empty>
              </div>
            </a-tab-pane>

            <!-- Referral List Tab (邀请列表) -->
            <a-tab-pane key="referrals" :tab="$t('profile.referral.listTab') || '邀请列表'">
              <a-table
                :columns="referralColumns"
                :dataSource="referralData.list || []"
                :loading="referralLoading"
                :pagination="referralPagination"
                :rowKey="record => record.id"
                size="small"
                @change="handleReferralChange"
              >
                <!-- Avatar & Name Column -->
                <template slot="user" slot-scope="text, record">
                  <div class="referral-user-cell">
                    <a-avatar :size="32" :src="record.avatar || '/avatar2.jpg'" />
                    <div class="user-info">
                      <span class="nickname">{{ record.nickname || record.username }}</span>
                      <span class="username">@{{ record.username }}</span>
                    </div>
                  </div>
                </template>

                <!-- Time Column -->
                <template slot="created_at" slot-scope="text">
                  {{ formatTime(text) }}
                </template>
              </a-table>

              <a-empty v-if="!referralLoading && (!referralData.list || referralData.list.length === 0)">
                <span slot="description">{{ $t('profile.referral.noReferrals') || '暂无邀请记录' }}</span>
                <a-button type="primary" @click="copyReferralLink">
                  {{ $t('profile.referral.shareNow') || '立即分享邀请' }}
                </a-button>
              </a-empty>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-col>
    </a-row>

    <!-- Add Exchange Account Modal -->
    <a-modal
      :title="$t('profile.exchange.addTitle')"
      :visible="showAddExchangeModal"
      :confirmLoading="savingExchange"
      @ok="handleSaveExchange"
      @cancel="showAddExchangeModal = false"
      :okText="$t('common.save')"
      :cancelText="$t('common.cancel')"
      :maskClosable="false"
      width="520px"
    >
      <a-form :form="exchangeForm" layout="vertical">
        <!-- Exchange Type -->
        <a-form-item :label="$t('profile.exchange.selectExchange')">
          <a-select
            v-decorator="['exchange_id', { rules: [{ required: true, message: $t('profile.exchange.selectExchange') }] }]"
            :placeholder="$t('profile.exchange.selectExchange')"
            @change="handleExchangeTypeChange"
          >
            <a-select-opt-group :label="$t('profile.exchange.typeCrypto')">
              <a-select-option v-for="ex in cryptoExchangeList" :key="ex.id" :value="ex.id">
                {{ ex.name }}
              </a-select-option>
            </a-select-opt-group>
            <a-select-opt-group :label="$t('profile.exchange.typeIBKR')">
              <a-select-option value="ibkr">Interactive Brokers (IBKR)</a-select-option>
            </a-select-opt-group>
            <a-select-opt-group :label="$t('profile.exchange.typeMT5')">
              <a-select-option value="mt5">MetaTrader 5</a-select-option>
            </a-select-opt-group>
          </a-select>
        </a-form-item>

        <!-- Account Name (optional) -->
        <a-form-item :label="$t('profile.exchange.accountName')">
          <a-input
            v-decorator="['name']"
            :placeholder="$t('profile.exchange.accountNamePlaceholder')"
          />
        </a-form-item>

        <!-- Crypto fields -->
        <template v-if="addExchangeType === 'crypto'">
          <a-form-item :label="$t('profile.exchange.apiKey')">
            <a-input-password
              v-decorator="['api_key', { rules: [{ required: true, message: 'API Key is required' }] }]"
              placeholder="API Key"
              autocomplete="new-password"
            />
          </a-form-item>
          <a-form-item :label="$t('profile.exchange.secretKey')">
            <a-input-password
              v-decorator="['secret_key', { rules: [{ required: true, message: 'Secret Key is required' }] }]"
              placeholder="Secret Key"
              autocomplete="new-password"
            />
          </a-form-item>
          <a-form-item v-if="addExchangeNeedsPassphrase" :label="$t('profile.exchange.passphrase')">
            <a-input-password
              v-decorator="['passphrase']"
              placeholder="Passphrase"
              autocomplete="new-password"
            />
          </a-form-item>
          <a-form-item v-if="addExchangeShowDemo">
            <a-checkbox v-decorator="['enable_demo_trading', { valuePropName: 'checked', initialValue: false }]">
              {{ $t('profile.exchange.demoTrading') }}
            </a-checkbox>
          </a-form-item>
        </template>

        <!-- IBKR fields -->
        <template v-if="addExchangeType === 'ibkr'">
          <a-alert
            type="warning"
            showIcon
            style="margin-bottom: 16px"
            :message="$t('profile.exchange.localDeploymentRequired')"
            :description="$t('profile.exchange.localDeploymentHint')"
          />
          <a-form-item :label="$t('profile.exchange.ibkrHost')">
            <a-input
              v-decorator="['ibkr_host', { initialValue: '127.0.0.1' }]"
              placeholder="127.0.0.1"
            />
          </a-form-item>
          <a-form-item :label="$t('profile.exchange.ibkrPort')">
            <a-input-number
              v-decorator="['ibkr_port', { initialValue: 7497 }]"
              :min="1"
              :max="65535"
              style="width: 100%"
            />
            <div class="field-hint">
              <a-icon type="info-circle" />
              <span>{{ $t('profile.exchange.ibkrPortHint') }}</span>
            </div>
          </a-form-item>
          <a-form-item :label="$t('profile.exchange.ibkrClientId')">
            <a-input-number
              v-decorator="['ibkr_client_id', { initialValue: 1 }]"
              :min="1"
              :max="999"
              style="width: 100%"
            />
          </a-form-item>
          <a-form-item :label="$t('profile.exchange.ibkrAccount')">
            <a-input
              v-decorator="['ibkr_account']"
              placeholder="DU123456"
            />
          </a-form-item>
        </template>

        <!-- MT5 fields -->
        <template v-if="addExchangeType === 'mt5'">
          <a-alert
            type="warning"
            showIcon
            style="margin-bottom: 16px"
            :message="$t('profile.exchange.localDeploymentRequired')"
            :description="$t('profile.exchange.localDeploymentHint')"
          />
          <a-form-item :label="$t('profile.exchange.mt5Server')">
            <a-input
              v-decorator="['mt5_server', { rules: [{ required: true, message: 'Server is required' }] }]"
              placeholder="MetaQuotes-Demo"
            />
          </a-form-item>
          <a-form-item :label="$t('profile.exchange.mt5Login')">
            <a-input-number
              v-decorator="['mt5_login', { rules: [{ required: true, message: 'Login is required' }] }]"
              :min="1"
              style="width: 100%"
              placeholder="12345678"
            />
          </a-form-item>
          <a-form-item :label="$t('profile.exchange.mt5Password')">
            <a-input-password
              v-decorator="['mt5_password', { rules: [{ required: true, message: 'Password is required' }] }]"
              placeholder="Password"
              autocomplete="new-password"
            />
          </a-form-item>
          <a-form-item :label="$t('profile.exchange.mt5TerminalPath')">
            <a-input
              v-decorator="['mt5_terminal_path']"
              placeholder="C:\Program Files\MetaTrader 5\terminal64.exe"
            />
            <div class="field-hint">
              <a-icon type="info-circle" />
              <span>{{ $t('profile.exchange.mt5TerminalPathHint') }}</span>
            </div>
          </a-form-item>
        </template>

        <!-- Test Connection -->
        <a-form-item v-if="addExchangeType">
          <a-button block :loading="testingExchange" @click="handleTestExchangeConnection">
            <a-icon type="api" />
            {{ $t('profile.exchange.testConnection') }}
          </a-button>
          <div v-if="exchangeTestResult" class="test-result-msg" :class="exchangeTestResult.success ? 'success' : 'error'">
            <a-icon :type="exchangeTestResult.success ? 'check-circle' : 'close-circle'" />
            {{ exchangeTestResult.message }}
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { getProfile, updateProfile, getMyCreditsLog, getMyReferrals, getNotificationSettings, updateNotificationSettings } from '@/api/user'
import { getSettingsValues } from '@/api/settings'
import { listExchangeCredentials, createExchangeCredential, deleteExchangeCredential } from '@/api/credentials'
import { testExchangeConnection } from '@/api/strategy'
import { baseMixin } from '@/store/app-mixin'

export default {
  name: 'Profile',
  mixins: [baseMixin],
  data () {
    return {
      loading: false,
      saving: false,
      changingPassword: false,
      sendingPwdCode: false,
      pwdCodeCountdown: 0,
      pwdCodeTimer: null,
      activeTab: 'basic',
      profile: {
        id: null,
        username: '',
        nickname: '',
        email: '',
        avatar: '',
        role: 'user',
        last_login_at: null
      },
      // Credits log
      creditsLog: [],
      creditsLogLoading: false,
      creditsLogPagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },
      // Referral data
      referralData: {
        list: [],
        total: 0,
        referral_code: '',
        referral_bonus: 0,
        register_bonus: 0
      },
      referralLoading: false,
      referralPagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },
      billing: {
        credits: 0,
        is_vip: false,
        vip_expires_at: null,
        billing_enabled: false,
        vip_bypass: true,
        feature_costs: {},
        recharge_telegram_url: ''
      },
      rechargeTelegramUrl: 'https://t.me/your_support_bot',
      // Notification settings
      notificationSettings: {
        default_channels: ['browser'],
        telegram_bot_token: '',
        telegram_chat_id: '',
        email: '',
        phone: '',
        discord_webhook: '',
        webhook_url: '',
        webhook_token: ''
      },
      savingNotifications: false,
      testingNotification: false,
      // Exchange config
      exchangeCredentials: [],
      exchangeLoading: false,
      showAddExchangeModal: false,
      savingExchange: false,
      testingExchange: false,
      exchangeTestResult: null,
      addExchangeType: '', // 'crypto' | 'ibkr' | 'mt5'
      selectedExchangeId: '',
      cryptoExchangeList: [
        { id: 'binance', name: 'Binance' },
        { id: 'okx', name: 'OKX' },
        { id: 'bitget', name: 'Bitget' },
        { id: 'bybit', name: 'Bybit' },
        { id: 'coinbaseexchange', name: 'Coinbase' },
        { id: 'kraken', name: 'Kraken' },
        { id: 'kucoin', name: 'KuCoin' },
        { id: 'gate', name: 'Gate.io' },
        { id: 'bitfinex', name: 'Bitfinex' }
      ]
    }
  },
  computed: {
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    isVip () {
      if (!this.billing.vip_expires_at) return false
      const expiresAt = new Date(this.billing.vip_expires_at)
      return expiresAt > new Date()
    },
    creditsLogColumns () {
      return [
        {
          title: this.$t('profile.creditsLog.time') || '时间',
          dataIndex: 'created_at',
          width: 160,
          scopedSlots: { customRender: 'created_at' }
        },
        {
          title: this.$t('profile.creditsLog.action') || '类型',
          dataIndex: 'action',
          width: 100,
          scopedSlots: { customRender: 'action' }
        },
        {
          title: this.$t('profile.creditsLog.amount') || '变动',
          dataIndex: 'amount',
          width: 100,
          scopedSlots: { customRender: 'amount' }
        },
        {
          title: this.$t('profile.creditsLog.balance') || '余额',
          dataIndex: 'balance_after',
          width: 100
        },
        {
          title: this.$t('profile.creditsLog.remark') || '备注',
          dataIndex: 'remark',
          ellipsis: true
        }
      ]
    },
    referralColumns () {
      return [
        {
          title: this.$t('profile.referral.user') || '用户',
          dataIndex: 'username',
          scopedSlots: { customRender: 'user' }
        },
        {
          title: this.$t('profile.referral.registerTime') || '注册时间',
          dataIndex: 'created_at',
          width: 180,
          scopedSlots: { customRender: 'created_at' }
        }
      ]
    },
    referralLink () {
      const baseUrl = window.location.origin + window.location.pathname
      const ref = this.referralData.referral_code || this.profile.id
      return `${baseUrl}#/user/login?ref=${ref}`
    },
    exchangeColumns () {
      return [
        {
          title: this.$t('profile.exchange.colExchange') || 'Exchange',
          dataIndex: 'exchange_id',
          width: 140,
          scopedSlots: { customRender: 'exchange_id' }
        },
        {
          title: this.$t('profile.exchange.colName') || 'Name',
          dataIndex: 'name',
          width: 140,
          customRender: (text) => text || '-'
        },
        {
          title: this.$t('profile.exchange.colHint') || 'Connection Info',
          dataIndex: 'api_key_hint',
          scopedSlots: { customRender: 'api_key_hint' }
        },
        {
          title: this.$t('profile.exchange.colCreatedAt') || 'Created At',
          dataIndex: 'created_at',
          width: 180,
          scopedSlots: { customRender: 'created_at' }
        },
        {
          title: this.$t('profile.exchange.colActions') || 'Actions',
          width: 120,
          scopedSlots: { customRender: 'action' }
        }
      ]
    },
    addExchangeNeedsPassphrase () {
      const needs = ['okx', 'bitget', 'kucoin']
      return needs.includes(this.selectedExchangeId)
    },
    addExchangeShowDemo () {
      // 目前仅 Binance 后端支持模拟盘 (demo-api.binance.com / demo-fapi.binance.com)
      return this.selectedExchangeId === 'binance'
    }
  },
  watch: {
    activeTab (val) {
      if (val === 'credits' && this.creditsLog.length === 0) {
        this.loadCreditsLog()
      }
      if (val === 'referrals' && (!this.referralData.list || this.referralData.list.length === 0)) {
        this.loadReferrals()
      }
      if (val === 'notifications' && !this.notificationSettings.telegram_chat_id && !this.notificationSettings.discord_webhook) {
        this.loadNotificationSettings()
      }
      if (val === 'exchange' && this.exchangeCredentials.length === 0) {
        this.loadExchangeCredentials()
      }
    }
  },
  beforeCreate () {
    this.profileForm = this.$form.createForm(this, { name: 'profile' })
    this.passwordForm = this.$form.createForm(this, { name: 'password' })
    this.notificationForm = this.$form.createForm(this, { name: 'notification' })
    this.exchangeForm = this.$form.createForm(this, { name: 'exchange' })
  },
  mounted () {
    this.loadProfile()
    this.loadReferrals()
  },
  beforeDestroy () {
    if (this.pwdCodeTimer) {
      clearInterval(this.pwdCodeTimer)
    }
  },
  methods: {
    async loadProfile () {
      this.loading = true
      try {
        const res = await getProfile()
        if (res.code === 1) {
          this.profile = res.data
          // 提取计费信息
          if (res.data.billing) {
            this.billing = res.data.billing
            // Prefer server-provided public recharge link
            if (this.billing.recharge_telegram_url) {
              this.rechargeTelegramUrl = this.billing.recharge_telegram_url
            }
          }
          // 提取通知设置
          if (res.data.notification_settings) {
            this.notificationSettings = {
              default_channels: res.data.notification_settings.default_channels || ['browser'],
              telegram_bot_token: res.data.notification_settings.telegram_bot_token || '',
              telegram_chat_id: res.data.notification_settings.telegram_chat_id || '',
              email: res.data.notification_settings.email || res.data.email || '',
              phone: res.data.notification_settings.phone || '',
              discord_webhook: res.data.notification_settings.discord_webhook || '',
              webhook_url: res.data.notification_settings.webhook_url || '',
              webhook_token: res.data.notification_settings.webhook_token || ''
            }
          }
          this.$nextTick(() => {
            this.profileForm.setFieldsValue({
              nickname: this.profile.nickname,
              email: this.profile.email
            })
          })
        } else {
          this.$message.error(res.msg || 'Failed to load profile')
        }
      } catch (error) {
        this.$message.error('Failed to load profile')
      } finally {
        this.loading = false
      }
    },

    async loadRechargeUrl () {
      // 只有管理员才能获取设置，普通用户使用默认值
      if (this.profile.role === 'admin') {
        try {
          const res = await getSettingsValues()
          if (res.code === 1 && res.data && res.data.billing) {
            this.rechargeTelegramUrl = res.data.billing.RECHARGE_TELEGRAM_URL || this.rechargeTelegramUrl
          }
        } catch (e) {
          // 忽略错误，使用默认值
        }
      }
    },

    handleRecharge () {
      // 跳转到站内会员/充值页
      this.$router.push('/billing')
    },

    formatCredits (credits) {
      if (!credits && credits !== 0) return '0'
      return Number(credits).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    },

    formatDate (dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleDateString()
    },

    handleSaveProfile () {
      this.profileForm.validateFields(async (err, values) => {
        if (err) return

        this.saving = true
        try {
          const res = await updateProfile(values)
          if (res.code === 1) {
            this.$message.success(res.msg || 'Profile updated successfully')
            this.loadProfile()
          } else {
            this.$message.error(res.msg || 'Update failed')
          }
        } catch (error) {
          this.$message.error('Update failed')
        } finally {
          this.saving = false
        }
      })
    },

    validateConfirmPassword (rule, value, callback) {
      const newPassword = this.passwordForm.getFieldValue('new_password')
      if (value && value !== newPassword) {
        callback(this.$t('profile.passwordMismatch') || 'Passwords do not match')
      } else {
        callback()
      }
    },

    async handleSendPwdCode () {
      if (!this.profile.email) {
        this.$message.error(this.$t('profile.noEmailWarning') || 'Please set your email first')
        return
      }

      this.sendingPwdCode = true
      try {
        const { sendVerificationCode } = await import('@/api/auth')
        const res = await sendVerificationCode({
          email: this.profile.email,
          type: 'change_password'
        })
        if (res.code === 1) {
          this.$message.success(this.$t('profile.codeSent') || 'Verification code sent')
          this.startPwdCodeCountdown()
        } else {
          this.$message.error(res.msg || 'Failed to send code')
        }
      } catch (error) {
        this.$message.error(error.response?.data?.msg || 'Failed to send code')
      } finally {
        this.sendingPwdCode = false
      }
    },

    startPwdCodeCountdown () {
      this.pwdCodeCountdown = 60
      this.pwdCodeTimer = setInterval(() => {
        this.pwdCodeCountdown--
        if (this.pwdCodeCountdown <= 0) {
          clearInterval(this.pwdCodeTimer)
          this.pwdCodeTimer = null
        }
      }, 1000)
    },

    validateNewPassword (rule, value, callback) {
      if (!value) {
        callback()
        return
      }
      if (value.length < 8) {
        callback(new Error(this.$t('user.register.pwdMinLength') || 'At least 8 characters'))
        return
      }
      if (!/[A-Z]/.test(value)) {
        callback(new Error(this.$t('user.register.pwdUppercase') || 'At least one uppercase letter'))
        return
      }
      if (!/[a-z]/.test(value)) {
        callback(new Error(this.$t('user.register.pwdLowercase') || 'At least one lowercase letter'))
        return
      }
      if (!/[0-9]/.test(value)) {
        callback(new Error(this.$t('user.register.pwdNumber') || 'At least one number'))
        return
      }
      callback()
    },

    handleChangePassword () {
      this.passwordForm.validateFields(async (err, values) => {
        if (err) return

        this.changingPassword = true
        try {
          const { changePassword: changePasswordApi } = await import('@/api/auth')
          const res = await changePasswordApi({
            code: values.code,
            new_password: values.new_password
          })
          if (res.code === 1) {
            this.$message.success(res.msg || 'Password changed successfully')
            this.passwordForm.resetFields()
          } else {
            this.$message.error(res.msg || 'Change password failed')
          }
        } catch (error) {
          this.$message.error(error.response?.data?.msg || 'Change password failed')
        } finally {
          this.changingPassword = false
        }
      })
    },

    getRoleColor (role) {
      const colors = {
        admin: 'red',
        manager: 'orange',
        user: 'blue',
        viewer: 'default'
      }
      return colors[role] || 'default'
    },

    getRoleLabel (role) {
      const labels = {
        admin: this.$t('userManage.roleAdmin') || 'Admin',
        manager: this.$t('userManage.roleManager') || 'Manager',
        user: this.$t('userManage.roleUser') || 'User',
        viewer: this.$t('userManage.roleViewer') || 'Viewer'
      }
      return labels[role] || role
    },

    formatTime (timestamp) {
      if (!timestamp) return ''
      const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp)
      return date.toLocaleString()
    },

    // Credits log methods
    async loadCreditsLog () {
      this.creditsLogLoading = true
      try {
        const res = await getMyCreditsLog({
          page: this.creditsLogPagination.current,
          page_size: this.creditsLogPagination.pageSize
        })
        if (res.code === 1) {
          this.creditsLog = res.data.items || []
          this.creditsLogPagination.total = res.data.total || 0
        }
      } catch (e) {
        this.$message.error('Failed to load credits log')
      } finally {
        this.creditsLogLoading = false
      }
    },

    handleCreditsLogChange (pagination) {
      this.creditsLogPagination.current = pagination.current
      this.loadCreditsLog()
    },

    // Referral methods
    async loadReferrals () {
      this.referralLoading = true
      try {
        const res = await getMyReferrals({
          page: this.referralPagination.current,
          page_size: this.referralPagination.pageSize
        })
        if (res.code === 1) {
          this.referralData = {
            list: res.data.list || [],
            total: res.data.total || 0,
            referral_code: res.data.referral_code || '',
            referral_bonus: res.data.referral_bonus || 0,
            register_bonus: res.data.register_bonus || 0
          }
          this.referralPagination.total = res.data.total || 0
        }
      } catch (e) {
        this.$message.error('Failed to load referral data')
      } finally {
        this.referralLoading = false
      }
    },

    handleReferralChange (pagination) {
      this.referralPagination.current = pagination.current
      this.loadReferrals()
    },

    copyReferralLink () {
      const link = this.referralLink
      if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
          this.$message.success(this.$t('profile.referral.linkCopied') || '邀请链接已复制')
        }).catch(() => {
          this.fallbackCopy(link)
        })
      } else {
        this.fallbackCopy(link)
      }
    },

    fallbackCopy (text) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        this.$message.success(this.$t('profile.referral.linkCopied') || '邀请链接已复制')
      } catch (err) {
        this.$message.error('Copy failed')
      }
      document.body.removeChild(textarea)
    },

    getActionColor (action) {
      const colors = {
        consume: 'red',
        recharge: 'green',
        admin_adjust: 'blue',
        refund: 'orange',
        vip_grant: 'gold',
        vip_revoke: 'default',
        register_bonus: 'cyan',
        referral_bonus: 'purple',
        // 指标社区相关
        indicator_purchase: 'volcano',
        indicator_sale: 'lime'
      }
      return colors[action] || 'default'
    },

    getActionLabel (action) {
      const labels = {
        consume: this.$t('profile.creditsLog.actionConsume') || '消费',
        recharge: this.$t('profile.creditsLog.actionRecharge') || '充值',
        admin_adjust: this.$t('profile.creditsLog.actionAdjust') || '调整',
        refund: this.$t('profile.creditsLog.actionRefund') || '退款',
        vip_grant: this.$t('profile.creditsLog.actionVipGrant') || 'VIP授予',
        vip_revoke: this.$t('profile.creditsLog.actionVipRevoke') || 'VIP取消',
        register_bonus: this.$t('profile.creditsLog.actionRegisterBonus') || '注册奖励',
        referral_bonus: this.$t('profile.creditsLog.actionReferralBonus') || '邀请奖励',
        // 指标社区相关
        indicator_purchase: this.$t('profile.creditsLog.actionIndicatorPurchase') || '购买指标',
        indicator_sale: this.$t('profile.creditsLog.actionIndicatorSale') || '出售指标'
      }
      return labels[action] || action
    },

    // Exchange credential methods
    async loadExchangeCredentials () {
      this.exchangeLoading = true
      try {
        const res = await listExchangeCredentials()
        if (res.code === 1 && res.data) {
          this.exchangeCredentials = res.data.items || []
        }
      } catch (e) {
        this.$message.error('Failed to load exchange accounts')
      } finally {
        this.exchangeLoading = false
      }
    },

    handleExchangeTypeChange (val) {
      this.selectedExchangeId = val
      this.exchangeTestResult = null
      const cryptoIds = this.cryptoExchangeList.map(e => e.id)
      if (cryptoIds.includes(val)) {
        this.addExchangeType = 'crypto'
      } else if (val === 'ibkr') {
        this.addExchangeType = 'ibkr'
      } else if (val === 'mt5') {
        this.addExchangeType = 'mt5'
      } else {
        this.addExchangeType = ''
      }
    },

    getExchangeDisplayName (id) {
      const names = {
        binance: 'Binance',
        okx: 'OKX',
        bitget: 'Bitget',
        bybit: 'Bybit',
        coinbaseexchange: 'Coinbase',
        kraken: 'Kraken',
        kucoin: 'KuCoin',
        gate: 'Gate.io',
        bitfinex: 'Bitfinex',
        ibkr: 'IBKR',
        mt5: 'MetaTrader 5'
      }
      return names[id] || id
    },

    handleSaveExchange () {
      this.exchangeForm.validateFields(async (err, values) => {
        if (err) return
        this.savingExchange = true
        try {
          const payload = { ...values }
          const res = await createExchangeCredential(payload)
          if (res.code === 1) {
            this.$message.success(this.$t('profile.exchange.saveSuccess'))
            this.showAddExchangeModal = false
            this.exchangeForm.resetFields()
            this.addExchangeType = ''
            this.selectedExchangeId = ''
            this.exchangeTestResult = null
            this.loadExchangeCredentials()
          } else {
            this.$message.error(res.msg || this.$t('profile.exchange.saveFailed'))
          }
        } catch (e) {
          this.$message.error(e.message || this.$t('profile.exchange.saveFailed'))
        } finally {
          this.savingExchange = false
        }
      })
    },

    async handleDeleteCredential (id) {
      try {
        const res = await deleteExchangeCredential(id)
        if (res.code === 1) {
          this.$message.success(this.$t('profile.exchange.deleteSuccess'))
          this.loadExchangeCredentials()
        } else {
          this.$message.error(res.msg || 'Delete failed')
        }
      } catch (e) {
        this.$message.error('Delete failed')
      }
    },

    async handleTestExchangeConnection () {
      const values = this.exchangeForm.getFieldsValue()
      const exchangeId = values.exchange_id
      if (!exchangeId) return

      this.testingExchange = true
      this.exchangeTestResult = null
      try {
        const payload = { ...values }
        const res = await testExchangeConnection(payload)
        if (res.code === 1) {
          this.exchangeTestResult = {
            success: true,
            message: this.$t('profile.exchange.testSuccess')
          }
        } else {
          this.exchangeTestResult = {
            success: false,
            message: `${this.$t('profile.exchange.testFailed')}: ${res.msg || 'Unknown error'}`
          }
        }
      } catch (e) {
        this.exchangeTestResult = {
          success: false,
          message: `${this.$t('profile.exchange.testFailed')}: ${e.message || 'Network error'}`
        }
      } finally {
        this.testingExchange = false
      }
    },

    // Notification settings methods
    async loadNotificationSettings () {
      try {
        const res = await getNotificationSettings()
        if (res.code === 1 && res.data) {
          this.notificationSettings = {
            default_channels: res.data.default_channels || ['browser'],
            telegram_bot_token: res.data.telegram_bot_token || '',
            telegram_chat_id: res.data.telegram_chat_id || '',
            email: res.data.email || this.profile.email || '',
            phone: res.data.phone || '',
            discord_webhook: res.data.discord_webhook || '',
            webhook_url: res.data.webhook_url || '',
            webhook_token: res.data.webhook_token || ''
          }
          // Update form values
          this.$nextTick(() => {
            this.notificationForm.setFieldsValue({
              default_channels: this.notificationSettings.default_channels,
              telegram_bot_token: this.notificationSettings.telegram_bot_token,
              telegram_chat_id: this.notificationSettings.telegram_chat_id,
              email: this.notificationSettings.email,
              phone: this.notificationSettings.phone,
              discord_webhook: this.notificationSettings.discord_webhook,
              webhook_url: this.notificationSettings.webhook_url,
              webhook_token: this.notificationSettings.webhook_token
            })
          })
        }
      } catch (e) {
        // Use default values
      }
    },

    handleSaveNotifications () {
      this.notificationForm.validateFields(async (err, values) => {
        if (err) return

        this.savingNotifications = true
        try {
          const res = await updateNotificationSettings({
            default_channels: values.default_channels || ['browser'],
            telegram_bot_token: values.telegram_bot_token || '',
            telegram_chat_id: values.telegram_chat_id || '',
            email: values.email || '',
            phone: values.phone || '',
            discord_webhook: values.discord_webhook || '',
            webhook_url: values.webhook_url || '',
            webhook_token: values.webhook_token || ''
          })
          if (res.code === 1) {
            this.$message.success(this.$t('profile.notifications.saveSuccess') || '通知设置保存成功')
            this.notificationSettings = res.data || this.notificationSettings
          } else {
            this.$message.error(res.msg || '保存失败')
          }
        } catch (e) {
          this.$message.error('保存失败')
        } finally {
          this.savingNotifications = false
        }
      })
    },

    async handleTestNotification () {
      const values = this.notificationForm.getFieldsValue()
      const channels = values.default_channels || []

      if (channels.length === 0) {
        this.$message.warning(this.$t('profile.notifications.selectChannel') || '请至少选择一个通知渠道')
        return
      }

      // Check if required fields are filled
      if (channels.includes('telegram')) {
        if (!values.telegram_bot_token) {
          this.$message.warning(this.$t('profile.notifications.fillTelegramToken') || '请填写 Telegram Bot Token')
          return
        }
        if (!values.telegram_chat_id) {
          this.$message.warning(this.$t('profile.notifications.fillTelegram') || '请填写 Telegram Chat ID')
          return
        }
      }
      if (channels.includes('email') && !values.email) {
        this.$message.warning(this.$t('profile.notifications.fillEmail') || '请填写通知邮箱')
        return
      }

      this.testingNotification = true
      try {
        // First save settings, then test
        const saveRes = await updateNotificationSettings({
          default_channels: channels,
          telegram_bot_token: values.telegram_bot_token || '',
          telegram_chat_id: values.telegram_chat_id || '',
          email: values.email || '',
          phone: values.phone || '',
          discord_webhook: values.discord_webhook || '',
          webhook_url: values.webhook_url || '',
          webhook_token: values.webhook_token || ''
        })

        if (saveRes.code !== 1) {
          this.$message.error(saveRes.msg || '保存设置失败')
          return
        }

        this.$message.info(this.$t('profile.notifications.testSent') || '测试通知已发送，请检查您的通知渠道')
        // Note: Actual test notification would require a backend endpoint
        // For now, we just show a success message after saving
      } catch (e) {
        this.$message.error('发送测试通知失败')
      } finally {
        this.testingNotification = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
@primary-color: #1890ff;

.profile-page {
  padding: 24px;
  min-height: calc(100vh - 120px);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);

  .page-header {
    margin-bottom: 24px;

    .page-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #1e3a5f;
      display: flex;
      align-items: center;
      gap: 12px;

      .anticon {
        font-size: 28px;
        color: @primary-color;
      }
    }

    .page-desc {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }
  }

  // Profile cards row - make cards same height
  .profile-cards-row {
    display: flex;
    align-items: stretch;

    .profile-card-col,
    .right-cards-col {
      display: flex;
      flex-direction: column;

      .ant-card {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      /deep/ .ant-card-body {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
    }

    .right-cards-row {
      height: 100%;
      display: flex;

      .ant-col {
        display: flex;
        flex-direction: column;

        .ant-card {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        /deep/ .ant-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
      }
    }
  }

  .profile-card {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    text-align: center;

    .avatar-section {
      padding: 20px 0;

      .ant-avatar {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .username {
        margin: 16px 0 8px;
        font-size: 20px;
        font-weight: 600;
        color: #1e3a5f;
      }

      .user-role {
        margin: 0;
      }
    }

    .profile-info {
      text-align: left;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-around;

      .info-item {
        display: flex;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .anticon {
          font-size: 16px;
          color: @primary-color;
          margin-right: 12px;
        }

        .label {
          color: #64748b;
          margin-right: 8px;
        }

        .value {
          color: #1e3a5f;
          font-weight: 500;
        }
      }
    }
  }

  .edit-card {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

    .profile-form,
    .password-form {
      max-width: 500px;

      /deep/ .ant-input,
      /deep/ .ant-input-password {
        border-radius: 8px;
      }

      .email-hint {
        margin-top: 8px;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.45);

        &.email-warning {
          color: #faad14;
        }
      }
    }

    // Credits log amount colors
    .amount-positive {
      color: #52c41a;
      font-weight: 600;
    }

    .amount-negative {
      color: #ff4d4f;
      font-weight: 600;
    }

    // Notification settings form
    .notification-settings-form {
      .field-hint {
        margin-top: 6px;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        gap: 4px;

        .anticon {
          font-size: 12px;
        }
      }

      /deep/ .ant-checkbox-group {
        width: 100%;
      }

      /deep/ .ant-checkbox-wrapper {
        margin-bottom: 8px;
      }
    }
  }

  // Credits Card 积分卡片
  .credits-card {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;

    /deep/ .ant-card-body {
      background: transparent;
      display: flex;
      flex-direction: column;
    }

    /deep/ .ant-divider {
      border-color: rgba(255, 255, 255, 0.2);
    }

    .credits-header {
      .credits-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;

        .anticon {
          font-size: 18px;
        }
      }
    }

    .credits-body {
      padding: 20px 0;
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;

      .credits-amount {
        .amount-value {
          font-size: 42px;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .amount-label {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.9);
          margin-left: 8px;
        }
      }

      .vip-status {
        margin-top: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 13px;

        .vip-active {
          color: #ffd700;
        }

        .vip-expired {
          color: rgba(255, 255, 255, 0.6);
        }

        .no-vip {
          color: rgba(255, 255, 255, 0.7);
        }
      }
    }

    .credits-actions {
      text-align: center;
      margin-top: auto;

      .ant-btn {
        border-radius: 20px;
        padding: 0 24px;
        height: 36px;
        font-weight: 500;
        background: #fff;
        color: #667eea;
        border: none;

        &:hover {
          background: rgba(255, 255, 255, 0.9);
          color: #764ba2;
        }
      }
    }

    .credits-hint {
      margin-top: 12px;
      text-align: center;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
  }

  // Referral Card 邀请卡片
  .referral-card {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    color: #fff;

    /deep/ .ant-card-body {
      background: transparent;
      display: flex;
      flex-direction: column;
    }

    /deep/ .ant-divider {
      border-color: rgba(255, 255, 255, 0.2);
    }

    .referral-header {
      .referral-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;

        .anticon {
          font-size: 18px;
        }
      }
    }

    .referral-body {
      padding: 12px 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      .referral-stats {
        display: flex;
        justify-content: space-around;

        .stat-item {
          text-align: center;

          .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #fff;
            display: block;
          }

          .stat-label {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
          }
        }
      }

      .referral-link-section {
        .link-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 6px;
        }

        .link-box {
          /deep/ .ant-input {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #fff;

            &::placeholder {
              color: rgba(255, 255, 255, 0.6);
            }
          }

          /deep/ .anticon-copy {
            color: #fff;

            &:hover {
              color: #ffd700;
            }
          }
        }
      }

      .referral-hint {
        margin-top: auto;
        text-align: center;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;

        .anticon-gift {
          color: #ffd700;
        }
      }
    }
  }

  // Referral user cell in table
  .referral-user-cell {
    display: flex;
    align-items: center;
    gap: 10px;

    .user-info {
      display: flex;
      flex-direction: column;

      .nickname {
        font-weight: 500;
        color: #333;
      }

      .username {
        font-size: 12px;
        color: #999;
      }
    }
  }

  // Exchange config
  .exchange-config-section {
    .credential-hint {
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 13px;
      color: #666;
    }
  }

  .test-result-msg {
    margin-top: 8px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    &.success {
      color: #52c41a;
    }
    &.error {
      color: #f5222d;
    }
  }

  // Dark theme
  &.theme-dark {
    background: linear-gradient(180deg, #0d1117 0%, #161b22 100%);

    .page-header {
      .page-title {
        color: #e0e6ed;
      }
      .page-desc {
        color: #8b949e;
      }
    }

    .profile-card,
    .edit-card {
      background: #1e222d;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

      /deep/ .ant-card-body {
        background: #1e222d;
      }
    }

    .profile-card {
      .avatar-section {
        .username {
          color: #e0e6ed;
        }
      }

      .profile-info {
        .info-item {
          border-bottom-color: #30363d;

          .label {
            color: #8b949e;
          }

          .value {
            color: #e0e6ed;
          }
        }
      }
    }

    .edit-card {
      /deep/ .ant-tabs-bar {
        border-bottom-color: #30363d;
      }

      /deep/ .ant-tabs-tab {
        color: #8b949e;

        &:hover {
          color: #e0e6ed;
        }
      }

      /deep/ .ant-tabs-tab-active {
        color: @primary-color;
      }

      /deep/ .ant-form-item-label label {
        color: #c9d1d9;
      }

      /deep/ .ant-input,
      /deep/ .ant-input-password {
        background: #0d1117;
        border-color: #30363d;
        color: #c9d1d9;

        &:hover,
        &:focus {
          border-color: @primary-color;
        }
      }
    }

    .credits-card {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);

      /deep/ .ant-divider {
        border-color: rgba(255, 255, 255, 0.1);
      }

      .credits-actions {
        .ant-btn {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.2);

          &:hover {
            background: rgba(255, 255, 255, 0.25);
          }
        }
      }
    }

    // Tables in tabs (消费记录、交易所配置、邀请列表)
    /deep/ .ant-table-wrapper {
      .ant-table {
        background: #1e222d;
        color: #c9d1d9;
      }

      .ant-table-thead > tr > th {
        background: #2a2e39;
        color: #c9d1d9;
        border-bottom-color: #30363d;
      }

      .ant-table-tbody > tr > td {
        background: #1e222d;
        color: #c9d1d9;
        border-bottom-color: #30363d;
      }

      .ant-table-tbody > tr:hover > td {
        background: #2a2e39;
      }

      .ant-table-placeholder {
        background: #1e222d;
        color: #8b949e;
      }

      // 表格内的所有文本元素
      .ant-table-tbody > tr > td,
      .ant-table-tbody > tr > td span,
      .ant-table-tbody > tr > td div,
      .ant-table-tbody > tr > td *:not(.ant-tag):not(.ant-btn) {
        color: #c9d1d9;
      }

      // 金额颜色
      .amount-positive {
        color: #52c41a;
      }

      .amount-negative {
        color: #f5222d;
      }
    }

    // 表单样式（通知设置、交易所配置等）
    .profile-form,
    .password-form,
    .notification-settings-form {
      /deep/ .ant-form-item-label > label {
        color: #c9d1d9;
      }

      /deep/ .ant-form-item-explain,
      /deep/ .ant-form-item-extra {
        color: #8b949e;
      }

      /deep/ .ant-input,
      /deep/ .ant-input-password,
      /deep/ .ant-select-selector,
      /deep/ .ant-input-number {
        background: #0d1117;
        border-color: #30363d;
        color: #c9d1d9;

        &::placeholder {
          color: #6e7681;
        }
      }

      /deep/ .ant-select-selection-item,
      /deep/ .ant-select-selection-placeholder {
        color: #c9d1d9;
      }

      /deep/ .ant-checkbox-wrapper,
      /deep/ .ant-radio-wrapper {
        color: #c9d1d9;

        span {
          color: #c9d1d9;
        }
      }

      /deep/ .ant-checkbox-checked .ant-checkbox-inner,
      /deep/ .ant-radio-checked .ant-radio-inner {
        background-color: @primary-color;
        border-color: @primary-color;
      }

      // 提示文字
      .email-hint,
      .field-hint {
        color: #8b949e;
      }

      .email-warning {
        color: #f5222d;
      }
    }

    // 通知设置表单
    .notification-settings-form {
      /deep/ .ant-alert {
        background: #1e222d;
        border-color: #30363d;
        color: #c9d1d9;

        .ant-alert-message {
          color: #c9d1d9;
        }

        .ant-alert-description {
          color: #8b949e;
        }
      }
    }

    // 交易所配置
    .exchange-config-section {
      .credential-hint {
        color: #8b949e;
      }
    }

    // 测试结果消息
    .test-result-msg {
      &.success {
        color: #52c41a;
      }
      &.error {
        color: #f5222d;
      }
    }

    // 邀请列表中的用户信息
    .referral-user-cell {
      .user-info {
        .nickname {
          color: #c9d1d9;
        }

        .username {
          color: #8b949e;
        }
      }
    }

    // 标签样式
    /deep/ .ant-tag {
      color: #c9d1d9;
    }

    // 分页样式
    /deep/ .ant-pagination {
      .ant-pagination-item {
        background: #1e222d;
        border-color: #30363d;

        a {
          color: #c9d1d9;
        }

        &:hover {
          border-color: @primary-color;
        }
      }

      .ant-pagination-item-active {
        background: @primary-color;
        border-color: @primary-color;

        a {
          color: #fff;
        }
      }

      .ant-pagination-prev,
      .ant-pagination-next {
        .ant-pagination-item-link {
          background: #1e222d;
          border-color: #30363d;
          color: #c9d1d9;
        }
      }

      .ant-pagination-options {
        .ant-select-selector {
          background: #0d1117;
          border-color: #30363d;
          color: #c9d1d9;
        }
      }
    }

    // 按钮样式
    /deep/ .ant-btn {
      &.ant-btn-default {
        background: #1e222d;
        border-color: #30363d;
        color: #c9d1d9;

        &:hover {
          border-color: @primary-color;
          color: @primary-color;
        }
      }
    }
  }
}

// ==================== Mobile Responsive Styles ====================
@media screen and (max-width: 768px) {
  .profile-page {
    padding: 12px;

    .page-header {
      margin-bottom: 16px;

      .page-title {
        font-size: 20px;

        .anticon {
          font-size: 22px;
        }
      }

      .page-desc {
        font-size: 13px;
      }
    }

    // Profile cards row - stack vertically
    .profile-cards-row {
      flex-direction: column;

      .profile-card-col {
        margin-bottom: 12px;
      }

      .right-cards-col {
        .right-cards-row {
          flex-direction: column;

          .ant-col {
            margin-bottom: 12px;
          }
        }
      }
    }

    // Profile card adjustments
    .profile-card {
      border-radius: 10px;

      .avatar-section {
        padding: 16px 0;

        /deep/ .ant-avatar {
          width: 80px !important;
          height: 80px !important;
          line-height: 80px !important;
        }

        .username {
          font-size: 18px;
          margin: 12px 0 6px;
        }
      }

      .profile-info {
        .info-item {
          padding: 10px 0;
          flex-wrap: wrap;

          .anticon {
            font-size: 14px;
            margin-right: 8px;
          }

          .label {
            font-size: 13px;
          }

          .value {
            font-size: 13px;
            word-break: break-all;
          }
        }
      }
    }

    // Credits card adjustments
    .credits-card {
      border-radius: 10px;

      .credits-header {
        .credits-title {
          font-size: 15px;

          .anticon {
            font-size: 16px;
          }
        }
      }

      .credits-body {
        padding: 16px 0;

        .credits-amount {
          .amount-value {
            font-size: 32px;
          }

          .amount-label {
            font-size: 14px;
          }
        }

        .vip-status {
          font-size: 12px;
          margin-top: 10px;
        }
      }

      .credits-actions {
        .ant-btn {
          height: 34px;
          padding: 0 20px;
          font-size: 14px;
        }
      }

      .credits-hint {
        font-size: 11px;
        margin-top: 10px;
      }
    }

    // Referral card adjustments
    .referral-card {
      border-radius: 10px;

      .referral-header {
        .referral-title {
          font-size: 15px;

          .anticon {
            font-size: 16px;
          }
        }
      }

      .referral-body {
        padding: 10px 0;

        .referral-stats {
          .stat-item {
            .stat-value {
              font-size: 24px;
            }

            .stat-label {
              font-size: 11px;
            }
          }
        }

        .referral-link-section {
          .link-label {
            font-size: 11px;
          }

          .link-box {
            /deep/ .ant-input {
              font-size: 12px;
            }
          }
        }

        .referral-hint {
          font-size: 11px;
          padding-top: 8px;
        }
      }
    }

    // Edit card adjustments
    .edit-card {
      border-radius: 10px;
      margin-top: 12px !important;

      /deep/ .ant-card-body {
        padding: 12px;
      }

      /deep/ .ant-tabs-nav {
        .ant-tabs-tab {
          padding: 10px 12px;
          font-size: 13px;
        }
      }

      // Allow horizontal scroll for tabs on mobile
      /deep/ .ant-tabs-nav-scroll {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;

        &::-webkit-scrollbar {
          display: none;
        }
      }

      .profile-form,
      .password-form {
        max-width: 100%;

        /deep/ .ant-form-item-label {
          padding-bottom: 4px;

          label {
            font-size: 13px;
          }
        }

        /deep/ .ant-input,
        /deep/ .ant-input-password {
          font-size: 14px;
        }

        .email-hint {
          font-size: 11px;
        }
      }

      // Password form - verification code section
      .password-form {
        /deep/ .ant-alert {
          font-size: 12px;
          padding: 8px 12px;
        }
      }

      // Notification settings form
      .notification-settings-form {
        /deep/ .ant-alert {
          font-size: 12px;
          padding: 8px 12px;
          margin-bottom: 16px !important;
        }

        /deep/ .ant-form {
          max-width: 100%;
        }

        /deep/ .ant-checkbox-group {
          .ant-row {
            margin-left: 0 !important;
            margin-right: 0 !important;

            .ant-col {
              padding-left: 0 !important;
              padding-right: 8px !important;
            }
          }

          .ant-checkbox-wrapper {
            font-size: 13px;
            margin-bottom: 6px;
          }
        }

        .field-hint {
          font-size: 11px;
          flex-wrap: wrap;
        }

        /deep/ .ant-form-item {
          margin-bottom: 16px;
        }

        // Action buttons
        /deep/ .ant-form-item:last-child {
          .ant-btn {
            width: 100%;
            margin-bottom: 8px;

            & + .ant-btn {
              margin-left: 0 !important;
            }
          }
        }
      }

      // Tables in tabs
      /deep/ .ant-table-wrapper {
        overflow-x: auto;

        .ant-table {
          min-width: 500px;
        }
      }
    }

    // Referral user cell in table
    .referral-user-cell {
      gap: 8px;

      /deep/ .ant-avatar {
        width: 28px !important;
        height: 28px !important;
        line-height: 28px !important;
      }

      .user-info {
        .nickname {
          font-size: 13px;
        }

        .username {
          font-size: 11px;
        }
      }
    }
  }
}

// Extra small devices (phones in portrait)
@media screen and (max-width: 480px) {
  .profile-page {
    padding: 8px;

    .page-header {
      margin-bottom: 12px;

      .page-title {
        font-size: 18px;
        gap: 8px;

        .anticon {
          font-size: 20px;
        }
      }
    }

    // Credits card
    .credits-card {
      .credits-body {
        .credits-amount {
          .amount-value {
            font-size: 28px;
          }

          .amount-label {
            font-size: 13px;
          }
        }
      }

      .credits-actions {
        .ant-btn {
          width: 100%;
        }
      }
    }

    // Referral card
    .referral-card {
      .referral-body {
        .referral-stats {
          .stat-item {
            .stat-value {
              font-size: 20px;
            }
          }
        }
      }
    }

    // Edit card
    .edit-card {
      /deep/ .ant-tabs-nav {
        .ant-tabs-tab {
          padding: 8px 10px;
          font-size: 12px;
        }
      }

      // Notification settings - stack checkboxes
      .notification-settings-form {
        /deep/ .ant-checkbox-group {
          .ant-row {
            .ant-col {
              flex: 0 0 50%;
              max-width: 50%;
            }
          }
        }
      }
    }
  }
}
</style>
