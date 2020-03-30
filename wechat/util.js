'use strict'

const xml2js = require('xml2js')
const Promise = require('bluebird')
const tpl = require('./tpl')

exports.parseXMLAsync = function(xml) {
  return new Promise(function(resolve, reject) {
    xml2js.parseString(xml, {trim: true}, function(err, content) {
      if(err) reject(err)
      else resolve(content)
    })
  })
}

function formatMessage(result) {
  const message = {}
  if (typeof result === 'object') {
    const keys = Object.keys(result)
    for (let i = 0; i < keys.length; i++) {
      // 消息是以数组的形式存储的，如message: ['123']
      const item = result[keys[i]]
      const key = keys[i]
      if (!(item instanceof Array) || item.length === 0) {
        continue
      }
      if (item.length === 1) {
        const val = item[0]
        if (typeof val === 'object') {
          message[key] = formatMessage(val)
        } else {
          message[key] = (val || '').trim()
        }
      } else {
        message[key] = []
        for (let j = 0, k = item.length; j < k; j++) {
          message[key].push(formatMessage(item[j]))
        }
      }
    }
  }
  return message
}

exports.formatMessage = formatMessage
exports.tpl = function(content, message) {
  console.log(333)
  const info = {}
  const type = 'text'
  const fromUserName = message.fromUserName
  const toUserName = message.toUserName
  if (Array.isArray(content)) {
    type = 'news'
  }
  type = content.type || type
  info.content = content
  info.createTime = new Date().getTime()
  info.toUserName = fromUserName
  info.fromUserName = toUserName
  return tpl.compiled(info)
}