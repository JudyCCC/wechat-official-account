// 声明generator函数：在function后面加入*

const gen = function* (n) {
  for (let i = 0; i < 3; i++) {
    n++
    yield n
  }
}

const genObj = gen(2)
// 传入2，n为3，执行到yield暂停，遇到next再执行
console.log(genObj.next()) // {value:3, done:false}
console.log(genObj.next()) // {value:4, done:false}
console.log(genObj.next()) // {value:5, done:false}
console.log(genObj.next()) // {value:undefined, done:true}