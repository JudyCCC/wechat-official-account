'use strict'

const Promise = require('bluebird')
const request = Promise.promisify(require('request'))
const fs = require('fs')
const _ = require('lodash')
const util = require('./util')

const prefix = 'https://api.weixin.qq.com/cgi-bin'
const mpPrefix = 'https://mp.weixin.qq.com/cgi-bin'
const semanticPrefix = 'https://api.weixin.qq.com/semantic/search?'
const api = {
  accessToken: `${prefix}token?grant_type=client_credential`,
  semanticPrefix,
  // 临时素材上传格式
  temporary: {
    upload: `${prefix}/media/upload?`,
    fetch: `${prefix}/media/get?`, // 获取素材
  },
  // 永久素材
  permanent: {
    upload: `${prefix}/material/add_material?`,
    uploadNews: `${prefix}/material/add_news?`, // 图文
    uploadNewsPic: `${prefix}/media/uploadimg?`, // 图文的图片
    fetch: `${prefix}/material/get_material?`,
    del: `${prefix}/material/del_material?`,
    update: `${prefix}/material/update_news?`,
    count: `${prefix}/material/get_materialcount?`,
    batch: `${prefix}/material/batchget_material?`
  },
  tags: {
    create: `${prefix}/tags/create?`,
    fetch: `${prefix}/tags/get?`,
    update: `${prefix}/tags/update?`,
    delete: `${prefix}/tags/delete?`,
    fetchTagUser: `${prefix}/user/tag/get?`,
    batchTag: `${prefix}//tags/members/batchtagging?`,
    batchUnTag: `${prefix}/tags/members/batchuntagging?`,
    fetchIdList: `${prefix}/tags/getidlist?`,
  },
  user: {
    remark: `${prefix}/user/info/updateremark?`,
    fetch: `${prefix}/user/info?`,
    batchFetch: `${prefix}/user/info/batchget?`,
    list: `${prefix}/user/get?`,
  },
  mass: {
    tag: `${prefix}/message/mass/sendall?`,
    openId: `${prefix}/message/mass/send?`,
    del: `${prefix}/message/mass/delete?`,
    preview: `${prefix}/message/mass/preview?`,
    check: `${prefix}/message/mass/get?`,
  },
  menu: {
    create: `${prefix}/menu/create?`,
    fetch: `${prefix}/menu/get??`,
    del: `${prefix}/menu/delete?`,
    current: `${prefix}/get_current_selfmenu_info?`,
  },
  qrcode: {
    create: `${prefix}/qrcode/create?`,
    show: `${mpPrefix}/showqrcode?`,
  },
  shortUrl: {
    create: `${prefix}/shorturl?`,
  },
  ticket: {
    fetch: `${prefix}/ticket/getticket?`,
  }
}

/**
 * 构造对象生成实例并初始化
 * @param {*} opts 
 * 先读取文件，看access_token是否过期
 * 如果过期，重新从微信服务器获取，然后写入新的票据信息
 */
function Wechat(opts) {
  const that = this
  // 把数据及方法暴露到自身的属性上
  this.appID = opts.appID
  this.appSecret = opts.appSecret
  this.getAccessToken = opts.getAccessToken
  this.saveAccessToken = opts.saveAccessToken
  this.getTicket = opts.getTicket
  this.saveTicket = opts.saveTicket
  this.fetchAccessToken()
}

Wechat.prototype.fetchAccessToken = function(data) {
  const that = this

  return this.getAccessToken().then(function(data) {
    // 获取token
    try {
      // 获取到token，往下验证合法性
      data = JSON.parse(data)
    } catch (e) {
      // 没有获取到token，更新token，返回的是一个Promise，直接进入then
      return that.updateAccessToken(data)
    }
    // 就算拿到票据也要验证合法性
    if(that.isValidAccessToken(data)) {
      // 如果合法，向下传递
      return Promise.resolve(data)
    } else {
      // 如果不合法，重新更新
      return that.updateAccessToken()
    }
  }).then(function(data) {
    that.access_token = data.access_token
    that.expires_in = data.expires_in
    that.saveAccessToken(data)
    return Promise.resolve(data)
  })
}

/**
 * 获取api_ticket 
 */
Wechat.prototype.fetchTicket = function(access_token) {
  const that = this
  
  return this.fetchTicket().then(function(data) {
    // 获取token
    try {
      // 获取到token，往下验证合法性
      data = JSON.parse(data)
    } catch (e) {
      // 没有获取到token，更新token，返回的是一个Promise，直接进入then
      return that.updateTicket(access_token)
    }
    // 就算拿到票据也要验证合法性
    if(that.isValidTicket(data)) {
      // 如果合法，向下传递
      return Promise.resolve(data)
    } else {
      // 如果不合法，重新更新
      return that.updateTicket(access_token)
    }
  }).then(function(data) {
    that.saveTicket(data)
    return Promise.resolve(data)
  })
}

Wechat.prototype.isValidAccessToken = function(data) {
  if (!data || !data.access_token || !data.expires_in) {
    return false
  }
  const access_token = data.access_token
  const expires_in = data.expires_in
  const now = (new Date().getTime())
  if (now < expires_in) {
    return true
  }
  return false
}

Wechat.prototype.isValidTicket = function(data) {
  if (!data || !data.ticket || !data.expires_in) {
    return false
  }
  const ticket = data.ticket
  const expires_in = data.expires_in
  const now = (new Date().getTime())
  if (ticket && now < expires_in) {
    return true
  }
  return false
}

/**
 * 希望更新access_token后继续往下
 * 所以内部封装Promise
 */
Wechat.prototype.updateAccessToken = function() {
  const appID = this.appID
  const appSecret = this.appSecret
  // 从微信服务器拿新token
  const url = `${api.accessToken}&appid=${appID}&secret=${appSecret}`
  console.log(url)
  return new Promise(function(resolve, reject) {
    // request是一个发送请求的库
    request({url, json: true}).then(function(response) {
      const data = response.body
      // const data = response[1]
      const now = (new Date().getTime())
      // 减去20秒是考虑到刷新以及服务器的延迟
      const expires_in = now + (data.expires_in - 20) * 1000
      // 把新的票据有效时间赋值给data
      data.expires_in = expires_in
      resolve(data)
    })
  })
}

Wechat.prototype.updateTicket = function() {
  // 从微信服务器拿新token
  const url = `${api.ticket.fetch}&access_token=${access_token}&type=jsapi`
  console.log(url)
  return new Promise(function(resolve, reject) {
    // request是一个发送请求的库
    request({url, json: true}).then(function(response) {
      const data = response.body
      // const data = response[1]
      const now = (new Date().getTime())
      // 减去20秒是考虑到刷新以及服务器的延迟
      const expires_in = now + (data.expires_in - 20) * 1000
      // 把新的票据有效时间赋值给data
      data.expires_in = expires_in
      resolve(data)
    })
  })
}

/**
 * 上传素材
 * material 上传图文时为数组， 上传图片时为路径
 */
Wechat.prototype.uploadMaterial = function(type, material, permanent) {
  const that = this
  const form = {}
  const uploadUrl = api.temporary.update
  if (permanent) {
    uploadUrl = api.permanent.upload
    _.extend(form, permanent)
  }
  if (type === 'pic') {
    uploadUrl = api.permanent.uploadNewsPic
  } else if (type === 'news') {
    uploadUrl = api.permanent.uploadNews
    form = material
  } else {
    form.media = fs.createReadStream(material)
  }
  const appID = this.appID
  const appSecret = this.appSecret
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${uploadUrl}&access_token=${data.access_token}&type=${type}`
      if (!permanent) {
        url += '&type=' + type
      } else {
        form.access_token = data.access_token
      }
      const options = {
        method: 'POST',
        url,
        json: true
      }

      if (type === 'news') {
        options.body = form
      } else {
        options.formData = form 
      }
      request(options)
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('Upload material fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 获取素材
 */
Wechat.prototype.fetchMaterial = function(mediaId, type, permanent) {
  const that = this
  const form = {}
  const fetchUrl = api.temporary.fetch
  if (permanent) {
    fetchUrl = api.permanent.fetch
  }
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${fetchUrl}&access_token=${data.access_token}&media_id=${mediaId}`
      const form = {}
      const options = {
        method: 'POST',
        url,
        json: true
      }
      // 如果是永久的，增加options.body
      if (permanent) {
        form.media_id = mediaId,
        form.access_token = data.access_token
        options.body = form
      } else {
        // 否则，追加url，且临时视频素材的协议为http协议
        if (type === 'video') {
          url = url.replace('https://', 'http://')
        }
        url += `&media_id=${mediaId}`
      }
      if(type === 'news' || type === 'video') {
        request(options)
        .then(function(response) {
          const _data = response[1]
          if(_data) {
            resolve(_data)
          } else {
            throw new Error('delete material fails')
          }
        })
        .catch(function(err) {
          reject(err)
        })
      } else {
        resolve(url)
      }
    })
  })
}

/**
 * 删除素材
 */
Wechat.prototype.deleteMaterial = function(mediaId) {
  const that = this
  const form = {
    media_id: mediaId
  }
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.permanent.del}&access_token=${data.access_token}&media_id=${mediaId}`
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('delete material fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 更新素材
 */
Wechat.prototype.updateMaterial = function(mediaId, news) {
  const that = this
  const form = {
    media_id: mediaId
  }

  _.extend(form, news)
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.permanent.update}&access_token=${data.access_token}&media_id=${mediaId}`
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('update material fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 获取素材总数
 */
Wechat.prototype.countMaterial = function(mediaId, news) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.permanent.count}&access_token=${data.access_token}`
      request({method: 'GET', url, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('count material fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 批量获取
 * options batch接口需要传的参数
 */
Wechat.prototype.batchMaterial = function(options) {
  const that = this

  options.type = options.type || 'image'
  options.offset = options.type || 0
  options.count = options.type || 1
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.permanent.batch}&access_token=${data.access_token}`
      request({method: 'POST', url, body: options, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('count material fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 创建标签
 */
Wechat.prototype.createTag = function(name) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.tags.create}&access_token=${data.access_token}`
      const form = {
        tag: {
          name
        }
      }
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('create tag fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 获取标签
 */
Wechat.prototype.fetchTags = function() {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.tags.fetch}&access_token=${data.access_token}`
      request({method: 'GET', url, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('fetch tag fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 更新标签
 */
Wechat.prototype.updateTag = function(id, name) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.tags.update}&access_token=${data.access_token}`
      const form = {
        tag: {
          id,
          name
        }
      }
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('update tag fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 删除标签
 */
Wechat.prototype.deleteTag = function(id) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.tags.delete}&access_token=${data.access_token}`
      const form = {
        tag: {
          id,
        }
      }
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('delete tag fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 获取标签下粉丝列表
 * next_openid 第一个拉取的openid不传默认从头拉取
 */
Wechat.prototype.fetchTagUsers = function(tagid, next_openid) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.tags.fetchTagUser}&access_token=${data.access_token}`
      const form = {
        tagid,
        next_openid
      }
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('fetch tag user fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 批量为用户打标签
 * openid_list 粉丝列表
 */
Wechat.prototype.batchTag = function(openid_list, tagid) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.tags.batchTag}&access_token=${data.access_token}`
      const form = {
        tagid,
        openid_list
      }
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('batch tag fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 批量为用户取消标签
 * openid_list 粉丝列表
 */
Wechat.prototype.batchUnTag = function(openid_list, tagid) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.tags.batchUnTag}&access_token=${data.access_token}`
      const form = {
        tagid,
        openid_list
      }
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('batch untag fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 查看用户的标签列表
 */
Wechat.prototype.fetchIdList = function(openid) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.tags.fetchIdList}&access_token=${data.access_token}`
      const form = {
        openid
      }
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('fetch id list fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 设置用户备注名
 */
Wechat.prototype.remarkUser = function(openid, remark) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.user.remark}&access_token=${data.access_token}`
      const form = {
        openid,
        remark
      }
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('Remark user fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 批量获取用户信息
 * openids为数组时， 是批量获取， 为字符串时为单个获取
 */
Wechat.prototype.fetchUsers = function(openids, lang='zh_CN') {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const options = {
        json: true
      }
      const form = {
        user_list: openids,
      }
      if (Array.isArray(openids)) {
        options.url = `${api.user.batchFetch}&access_token=${data.access_token}`
        options.method = 'POST'
        options.body = form
      } else {
        options.url = `${api.user.fetch}&access _token=${data.access_token}&openid=${openids}&lang=${lang}`
        options.method = 'GET'
      } 
      request(options)
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('Remark user fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 获取用户列表
 */
Wechat.prototype.listUsers = function(openid) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.user.list}&access_token=${data.access_token}`
      if (openid) {
        url += `&next_openid=${openid}`
      }
      request({method: 'GET', url, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('list user fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 根据标签进行群发
 */
Wechat.prototype.sendByTag = function(type, message, tagid) {
  const that = this

  const form = {
    msgtype: type,
    [type]: message
  }

  if (!tagid) {
    form.filter = {
      is_to_all: true
    }
  } else {
    form.filter = {
      is_to_all: false,
      tag_id: tagid
    }
  }
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.mass.tag}&access_token=${data.access_token}`
      
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('send to tag fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 根据OpenID列表群发
 */
Wechat.prototype.sendByOpenId = function(type, message, openIds) {
  const that = this

  const form = {
    msgtype: type,
    touser: openIds,
    [type]: message
  }
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.mass.openId}&access_token=${data.access_token}`
      
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('send by openid fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 删除群发
 */
Wechat.prototype.deleteMass = function(msgId, articleIdx) {
  const that = this

  const form = {
    msg_id: msgId,
    article_idx: articleIdx
  }
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.mass.del}&access_token=${data.access_token}`
      
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('delete mass fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 预览接口
 */
Wechat.prototype.previewMass = function(type, message, openId) {
  const that = this

  const form = {
    msgtype: type,
    touser: openId,
    [type]: message
  }
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.mass.preview}&access_token=${data.access_token}`
      
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('preview mass fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 查询群发消息发送状态
 */
Wechat.prototype.checkMass = function(msgId) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.user.check}&access_token=${data.access_token}`
      const form = {
        msg_id: msgId
      }
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('check mass fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 创建菜单
 */
Wechat.prototype.createMenu = function(menu) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.menu.create}&access_token=${data.access_token}`
      request({method: 'POST', url, body: menu, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('create menu fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/** 
 * 获取自定义菜单配置
 */
Wechat.prototype.fetchMenu = function(menu) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.menu.fetch}&access_token=${data.access_token}`
      request({url, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('fetch menu fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 删除菜单
 */
Wechat.prototype.deleteMenu = function() {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.menu.del}&access_token=${data.access_token}`
      request({url, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('create menu fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 查询公众号当前使用的自定义菜单配置
 */
Wechat.prototype.getCurrentMenu = function() {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.menu.current}&access_token=${data.access_token}`
      request({url, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('get current menu fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 生成带参数的二维码
 */
Wechat.prototype.createQrcode = function(qr) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.qrcode.create}&access_token=${data.access_token}`
      request({method: 'POST', url, body: qr, json:true})
      .then(function(response) {
        const _data = response[1]
        if(_data) {
          resolve(_data)
        } else {
          throw new Error('create qrcode fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 通过ticket换取二维码
 */
Wechat.prototype.showQrcode = function(ticket) {
  return `${api.qrcode.show}ticket=${encodeURI(ticket)}`
}

/**
 * 长链接转短链接
 */
Wechat.prototype.createShorturl = function(action='long2short', url) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.shortUrl.create}&access_token=${data.access_token}`
      const form = {
        action,
        long_url: url
      }
      request({method: 'POST', url, body: form, json:true})
      .then(function(response) {
        const _data = response[1]
        if (_data) {
          resolve(_data)
        } else {
          throw new Error('create shorturl fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

/**
 * 语义化理解
 */
Wechat.prototype.semantic = function(semanticData) {
  const that = this
  
  return new Promise(function(resolve, reject) {
    that
    .fetchAccessToken()
    .then(function(data) {
      const url = `${api.semanticPrefix}&access_token=${data.access_token}`
      semanticData.appid = data.appID
      request({method: 'POST', url, body: semanticData, json:true})
      .then(function(response) {
        const _data = response[1]
        if (_data) {
          resolve(_data)
        } else {
          throw new Error('semantic fails')
        }
      })
      .catch(function(err) {
        reject(err)
      })
    })
  })
}

Wechat.prototype.reply = function() {
  const content = this.body
  const message = this.weixin
  const xml = util.tpl(content, message)
  this.status = 200
  this.type = 'application/xml'
  this.body = xml
}

module.exports = Wechat