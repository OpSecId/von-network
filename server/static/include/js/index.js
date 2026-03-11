
var app = new Vue({
  el: '#vue-outer',
  data: {
    anonymous: true,
    init_error: null,
    ready: false,
    reg_info: { reg_type: 'seed', did: null, verkey: null, role: 'ENDORSER', seed: null, alias: null },
    reg_error: null,
    reg_result: null,
    register_new_dids: false,
    show_register_modal: false,
    enable_auth_rule: false,
    show_auth_rule_modal: false,
    auth_rule_info: {
      auth_type: 'SCHEMA',
      auth_action: 'ADD',
      field: '*',
      old_value: '*',
      new_value: '*',
      sig_count: 1,
      role: '101',
      need_to_be_owner: false
    },
    auth_rule_result: null,
    auth_rule_error: null,
    auth_rule_loading: false,
    display_ledger_state: false,
    loading: false,
    status: null,
    syncing: false
  },
  computed: {
    role_options: function () {
      return [
        { value: 'ENDORSER', label: 'Endorser' }
      ];
    },
    auth_rule_role_options: function () {
      return [
        { value: '0', label: 'TRUSTEE' },
        { value: '2', label: 'STEWARD' },
        { value: '101', label: 'ENDORSER' }
      ];
    },
    auth_rule_type_options: function () {
      return [
        { value: 'SCHEMA', label: 'SCHEMA' },
        { value: 'CLAIM_DEF', label: 'CLAIM_DEF (CRED_DEF)' },
        { value: 'NYM', label: 'NYM' },
        { value: 'ATTRIB', label: 'ATTRIB' },
        { value: 'REVOC_REG_DEF', label: 'REVOC_REG_DEF' },
        { value: 'REVOC_REG_ENTRY', label: 'REVOC_REG_ENTRY' }
      ];
    }
  },
  mounted: function () {
    this.fetchStatus();
  },
  methods: {
    fetchStatus: function () {
      var self = this;
      fetch('/status?validators=' + (this.ready ? '1' : '')).then(function (response) {
        if (response.ok) {
          response.json().then(function (result) {
            var prev_ready = self.ready;
            self.anonymous = result.anonymous;
            self.init_error = result.init_error;
            self.ready = result.ready;
            self.register_new_dids = result.register_new_dids;
            self.display_ledger_state = result.display_ledger_state;
            self.enable_auth_rule = result.enable_auth_rule || false;
            self.syncing = result.syncing;
            if (self.ready) {
              self.status = result.validators ? self.formatValidatorStatus(result.validators) : null;
              setTimeout(function () { self.fetchStatus(); }, prev_ready ? 60000 : 1000);
            } else {
              setTimeout(function () { self.fetchStatus(); }, 10000);
            }
          });
        }
      }).catch(
        function (err) {
          console.error("Error fetching server config:", err);
        }
      );
    },
    formatValidatorStatus: function (status) {
      var formatted = {
        err: !Array.isArray(status),
        rows: []
      };

      if (!formatted.err) {
        for (var idx = 0; idx < status.length; idx++) {
          var node = status[idx],
            info = node.Node_info;

          // Skip nodes with error condition
          if (node.error) {
            console.error('Received error status for validator node ' + (info && info.Name) + ':', node.error);
            continue;
          }
          if (!info) {
            continue;
          }

          var result = {};

          result.name = info.Name;
          result.did = info.did;
          result.state = node.state;
          if (!result.state && node.enabled)
            result.state = 'unknown';
          result.indy_version = (node.software || node.Software || {})['indy-node'] || '?';

          var metrics = info.Metrics || {};
          var poolInfo = node.Pool_info || {};
          var upt = metrics.uptime;
          if (typeof upt === 'number') {
            var upt_s = upt % 60,
              upt_m = Math.floor(upt % 3600 / 60),
              upt_h = Math.floor(upt % 86400 / 3600),
              upt_d = Math.floor(upt / 86400),
              upt_parts = [];
            if (upt_d) { upt_parts.push('' + upt_d + ' days'); }
            if (upt_h || upt_parts.length) { upt_parts.push('' + upt_h + ' hours'); }
            if (upt_m || upt_parts.length) { upt_parts.push('' + upt_m + ' minutes'); }
            upt_parts.push('' + upt_s + ' seconds');
            result.uptime = upt_parts.join(', ');
          } else {
            result.uptime = '';
          }

          if (poolInfo.Unreachable_nodes_count) {
            result.unreachable = (poolInfo.Unreachable_nodes || []).join(', ');
          } else {
            result.unreachable = null;
          }

          var totalCount = poolInfo.Total_nodes_count;
          var reachableCount = poolInfo.Reachable_nodes_count;
          result.progress = (totalCount && typeof reachableCount === 'number') ? reachableCount / totalCount : 0;
          result.dash_array = 339.292;
          result.dash_offset = result.dash_array * (1 - result.progress);

          var shorten = function (val) {
            if (typeof val === 'number') {
              if (val > 1000000) {
                return (val / 1000000).toPrecision(3) + 'M';
              }
              if (val > 1000) {
                return (val / 1000).toPrecision(3) + 'K';
              }
              if (Math.trunc(val) === val) {
                return val;
              }
              return val.toPrecision(3);
            }
            return val;
          };
          var tx_avgs = metrics['average-per-second'] || {};
          var tx_counts = metrics['transaction-count'] || {};
          result.txns = [
            shorten(tx_counts.config) + ' config',
            shorten(tx_counts.ledger) + ' ledger',
            shorten(tx_counts.pool) + ' pool',
            shorten(tx_avgs['read-transactions']) + '/s read',
            shorten(tx_avgs['write-transactions']) + '/s write'
          ].join(', ');

          formatted.rows.push(result);
        }
      }

      return formatted;
    },
    register: function () {
      this.loading = true;
      this.reg_error = null;
      this.reg_result = null;
      var self = this;
      var info = { role: this.reg_info.role, alias: this.reg_info.alias };
      if (this.reg_info.reg_type == 'seed') {
        info.did = this.reg_info.did;
        info.seed = this.reg_info.seed;
      } else {
        info.did = this.reg_info.did;
        info.verkey = this.reg_info.verkey;
      }
      fetch('/register', {
        method: 'POST',
        body: JSON.stringify(info),
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(
        function (res) {
          if (res.status == 200) {
            res.json().then(function (result) {
              self.reg_result = result;
              self.loading = false;
            });
          } else {
            console.log(res);
            self.reg_error = true;
            self.loading = false;
          }
        }
      ).catch(
        function (err) {
          self.reg_error = true;
          self.loading = false;
        }
      );
    },
    openRegisterModal: function () {
      this.show_register_modal = true;
    },
    openAuthRuleModal: function () {
      this.show_auth_rule_modal = true;
    },
    submitAuthRule: function () {
      this.auth_rule_loading = true;
      this.auth_rule_error = null;
      this.auth_rule_result = null;
      var self = this;
      var body = {
        auth_type: this.auth_rule_info.auth_type,
        auth_action: this.auth_rule_info.auth_action,
        field: this.auth_rule_info.field || '*',
        old_value: this.auth_rule_info.old_value || '*',
        new_value: this.auth_rule_info.new_value || '*',
        sig_count: parseInt(this.auth_rule_info.sig_count, 10) || 1,
        role: String(this.auth_rule_info.role),
        need_to_be_owner: this.auth_rule_info.need_to_be_owner
      };
      fetch('/auth-rule', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      }).then(function (res) {
        return res.text().then(function (text) {
          var data;
          try { data = JSON.parse(text); } catch (e) { data = { detail: text || 'Request failed' }; }
          if (res.status === 200) {
            self.auth_rule_result = data;
            self.auth_rule_loading = false;
          } else {
            self.auth_rule_error = data.detail || data.error || text || 'Request failed';
            self.auth_rule_loading = false;
          }
        });
      }).catch(function (err) {
        self.auth_rule_error = err.message || 'Request failed';
        self.auth_rule_loading = false;
      });
    }
  }
});
