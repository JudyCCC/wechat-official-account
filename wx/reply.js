'use strict'
const config = require('../config')
const Wechat = require('../wechat/wechat')
const menu = require('./menu')
const path = require('path')

const wechatApi = new Wechat(config.wechat)

// 只执行一次/创建菜单
wechatApi.deleteMenu().then(function() {
  return wechatApi.createMenu(menu)
})
  .then(function(msg) {
    console.log(msg)
  })

exports.reply = function* (next) {
  const message = this.weixin
  // 事件推送
  if (message.MsgType === 'event') {
    // 订阅
    if (message.Event === 'subscribe') {
      if (message.EventKey) {
        console.log('扫二维码进来:' + message.EventKey + ' ' + message.ticket)
      }
      this.body = '哈哈，你订阅了这个号'
    } else if (message.EventKey === 'unsubscribe') {
      console.log('无情取关') 
      this.body = ''  
    } else if (message.Event === 'LOCATION') {
      // 上报用户当前位置
      this.body = '您上报的位置是: ' + message.Latitude + '/' + 
      message.Longitude + '-' + message.Precision
    } else if (message.Event === 'CLICK') {
      // 点击菜单
      this.body = '您点击了菜单：' + message.Event
    } else if (message.Event === 'SCAN') {
      // 扫描二维码
      console.log('关注后扫二维码' + message.EventKey + ' ' + message.TIcket)
      this.body = '看到你扫了一下哦'
    } else if (message.EventKey === 'VIEW') {
      this.body = '您点击了菜单中的链接：' + message.Event
    } else if (message.EventKey === 'scancode_push') {
      console.log(message.ScanCodeInfo.ScanType)
      console.log(message.SendPicsInfo.ScanResult)
      this.body = '您点击了菜单中的链接：' + message.Event
    } else if (message.EventKey === 'scancode_waitmsg') {
      console.log(message.ScanCodeInfo.ScanType)
      console.log(message.SendPicsInfo.ScanResult)
      this.body = '您点击了菜单中的链接：' + message.Event
    } else if (message.EventKey === 'pic_sysphoto') {
      console.log(message.SendPicsInfo.PicList)
      console.log(message.SendPicsInfo.Count)
      this.body = '您点击了菜单中的链接：' + message.Event
    } else if (message.EventKey === 'pic_photo_or_album') {
      console.log(message.SendPicsInfo.PicList)
      console.log(message.SendPicsInfo.Count)
      this.body = '您点击了菜单中的链接：' + message.Event
    } else if (message.EventKey === 'pic_weixin') {
      console.log(message.SendPicsInfo.PicList)
      console.log(message.SendPicsInfo.Count)
      this.body = '您点击了菜单中的链接：' + message.Event
    }else if (message.EventKey === 'location_select') {
      console.log(message.SendLocationInfo.Location_X)
      console.log(message.SendLocationInfo.Location_Y)
      console.log(message.SendLocationInfo.Scale)
      console.log(message.SendLocationInfo.Label)
      console.log(message.SendLocationInfo.Poiname)
      this.body = '您点击了菜单中的链接：' + message.Event
    }
  } else if (message.MsgType === 'text') {
    const content = message.Content
    const reply = '额，你说的 ' + message.Content + ' 太复杂了'
    // 根据用户输入制度特定回复
    if (content === '1') {
      reply = '天下第一吃大米'
    } else if (content === '2') {
      reply = '天下第二吃豆腐'
    } else if (content === '3') {
      reply = '天下第三吃仙丹'
    } else if (content === '4') {
      // 回复文章链接
      reply = [{
        title: '技术改变世界',
        description: '只是个描述而已',
        url: 'https://github.com/',
        picUrl: 'http://img0.imgtn.bdimg.com/it/u=621893231,809483113&fm=26&gp=0.jpg'
      }, {
        title: 'Nodejs 开发微信',
        description: '爽到爆',
        url: 'https://nodejs.org/',
        picUrl: 'https://ss0.bdstatic.com/70cFvHSh_Q1YnxGkpoWK1HF6hhy/it/u=275839115,1331880091&fm=26&gp=0.jpg'
      }]
    } else if (content === '5') {
      const data = yield wechatApi.uploadMaterial(
        'image',
        path.join(__dirname, '../2.jpeg')
      )
      reply = {
        type: 'image',
        mediaId: data.media_id
      }
    } else if (content === '6') {
      const data = yield wechatApi.uploadMaterial(
        'video',
        path.join(__dirname, '../movie.mp4')
      )
      reply = {
        type: 'video',
        title: '熊',
        description: '熊洗澡',
        mediaId: data.media_id
      }
    } else if (content === '7') {
      const data = yield wechatApi.uploadMaterial(
        'image',
        path.join(__dirname, '../2.jpeg')
      )
      reply = {
        type: 'music',
        title: '马',
        description: '马叫',
        musicUrl: 'https://www.runoob.com/try/demo_source/horse.mp3',
        thumbMediaId: data.media_id,
      }
    } else if (content === '8') {
      const data = yield wechatApi.uploadMaterial(
        'image',
        path.join(__dirname, '../2.jpeg'),
        {type: 'image'}
      )
      reply = {
        type: 'image',
        mediaId: data.media_id
      }
    } else if (content === '9') {
      const data = yield wechatApi.uploadMaterial(
        'video',
        path.join(__dirname, '../movie.mp4'),
        {type: 'video', description: '{"title": "Really", "introduction": "difficult"}'}
      )
      reply = {
        type: 'video',
        title: '熊',
        description: '熊洗澡',
        mediaId: data.media_id
      }
    } else if (content === '10') {
      // 先上传一个图文的永久素材
      const picData = yield wechatApi.uploadMaterial(
        'image',
        path.join(__dirname, '../2.jpeg'),
        {} // 空对象表示传永久素材
      ) 
      const media = {
        articles: [{
          title: 'tututu2',
          thumb_media_id: picData.media_id,
          author: 'Judy', 
          digest: '没有摘要',
          show_cover_pic: 1,
          content: '没有内容',
          content_source_url: 'https://github.com'
        }]
      }
      data = yield wechatApi.uploadMaterial('news', media, {})
      // 再拿这个永久素材的信息的数组
      data = yield wechatApi.fetchMaterial(data.media_id, 'news', {})
      const items = data.news_item
      const news = []

      items.forEach(function(item) {
        news.push({
          title:item.title,
          description: item.digest,
          picUrl: picData.url,
          url: item.url
        })
      })
      reply = news
    } else if (content === '11') {
      const counts = yield wechatApi.countMaterial()
      const results = yield [
        wechatApi.batchMaterial({
          type: 'image',
          offset: 0,
          count: 10
        }, {
          type: 'video',
          offset: 0,
          count: 10
        }, {
          type: 'voice',
          offset: 0,
          count: 10
        }, {
          type: 'news',
          offset: 0,
          count: 10
        })
      ]
      console.log(results)
      reply = '1'
    } else if (content === '12') {
      const group = yield wechatApi.createTag('wechat')
      console.log('新标签 wechat')
      console.log(group)

      const groups = yield wechatApi.fetchTags()
      console.log('加了wechat标签后的标签列表')
      console.log(groups)

      const group2 = yield wechatApi.fetchIdList(message.FromUserName)
      console.log('查看自己的标签列表')
      console.log(group2)
    } else if (content === '13') {
      const user = yield wechatApi.fetchUsers(message.FromUserName, 'en')
      console.log(user)

      const openids = [{
        openid: message.FromUserName,
        lang: 'en'
      }]
      const users = yield wechatApi.fetchUsers(openids)
      console.log(users)

      reply = JSON.stringify(user)
    } else if (content === '14') {
      const userlist = yield wechatApi.listUsers()
      console.log(userlist)

      reply = userlist.total
    } else if (content === '15') {
      // 通过11或其他获取需要的userid， messageid等
      // const mpnews = {
      //   media_id: '' // 缺id
      // }
      // const msgData = yield wechatApi.sendByTag('mpnews', mpnews, 119)
      // console.log(msgData)

      const text = {
        content: 'Hello Wechat'
      }
      const msgData2 = yield wechatApi.sendByTag('text', text, 119)
      console.log(msgData2)
      reply = 'Yeah!'
      // 45028错误， 群发次数用完
    } else if (content === '16') {
      const text = {
        content: 'Hello Wechat'
      }
      // ''内随便找个userid
      const msgData2 = yield wechatApi.previewMass('text', text, '')
      console.log(msgData2)
      reply = 'Yeah!'
    } else if (content === '17') {
      // '' 内为群发的messageId
      const msgData = yield wechatApi.checkMass('')
      console.log(msgData)
      reply = 'suc!'
    }
  }
  this.body = reply
  yield next
}