'use strict'

const path = require('path')
const util = require('./libs/util')
const wechat_file = path.join(__dirname, './config/wechat.txt')
const wechat_ticket_file = path.join(__dirname, './config/wechat_ticket.txt')

const config = {
  wechat: {
    appID: 'wxb7b521eab48bd39a',
    appSecret: '77020420b979afabffb268b459d0fb58',
    token: 'immocsccotlearnnodejs',
    getAccessToken: function(data) {
      return util.readFileAsync(wechat_file)
    },
    saveAccessToken: function(data) {
      data = JSON.stringify(data);
      return util.writeFileAsync(wechat_file, data)
    },
    getTicket: function(data) {
      return util.readFileAsync(wechat_ticket_file)
    },
    saveTicket: function(data) {
      data = JSON.stringify(data);
      return util.writeFileAsync(wechat_ticket_file, data)
    }
  }
}

module.exports = config