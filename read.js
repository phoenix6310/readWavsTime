let fs = require('fs')
let path = require('path')
let execFun = require('child_process').exec;
let xlsx = require('node-xlsx')
let moment = require("moment")

let { entry } = require("./config.js")

let fileInfos = []
let fileDirnames = new Set()
let usernames = new Set()
// 读目录 同步方法
let readDirFun = (basePath, nextPath) => {
    let readPath = basePath
    if (!readPath) {
        readPath = nextPath
    }
    let files = fs.readdirSync(readPath)
    if (files.length) {
        for (const filename of files) {
            let nextPath = `${readPath}\/${filename}`
            // console.log(nextPath)
            let stats = fs.statSync(nextPath)
            if (stats.isDirectory()) {
                // console.log(nextPath)
                readDirFun('', nextPath)
            } else {
                let fileExtname = path.extname(nextPath)
                if (fileExtname === ".wav") {
                    // 去掉空格
                    let oldPath = nextPath
                    let newPath = oldPath.replace(/ /g, '_')
                    let fileDirname = path.dirname(nextPath)
                    // 根据path获取path的目录名
                    fileDirnames.add(fileDirname)
                    let username = path.parse(fileDirname).name
                    usernames.add(username)
                    let fileInfo = {
                        filePath: nextPath,
                        fileDirname: fileDirname,
                        username: username,
                        filename: path.parse(nextPath).base,
                        index: fileInfos.length,
                        hasGetfileInfo: false
                    }
                    fileInfos.push(fileInfo)
                }
            }
        }
    }
}

// 开始读目录
readDirFun(entry)
// 输出文件信息至excel
collectFileInfo(formatFileInfos)
// 通过sox获取音频信息
function getFileInfo(path) {
    return new Promise((resolve, reject) => {
        execFun(`sox "${path}" -n stat`, (err, stdout, stderr) => {
            if (!err) {
                let infoStr = stderr.toString()
                resolve(infoStr)
            }
        })
    })
}
// 收集所有音频文件的信息
async function collectFileInfo(callback) {
    if (fileInfos.length) {
        console.log("【开始读取文件信息（等待时间可能较长），请稍后...】")
        for (const fileInfo of fileInfos) {
            // console.log(fileInfo)
            let fileDirname = fileInfo.fileDirname
            let filePath = fileInfo.filePath
            let filename = fileInfo.filename
            let infoStr = await getFileInfo(filePath)
            fileInfo.hasGetfileInfo = true
            fileInfo.infoStr = infoStr.replace(/( )*/g, '')
            // 这里待优化  提取音频时长，等用正则优化
            let startIndex = fileInfo.infoStr.indexOf('Length(seconds):')
            let endIndex = fileInfo.infoStr.indexOf('\r\nScaledby')
            fileInfo.fileTime = +fileInfo.infoStr.slice(startIndex, endIndex).split(':')[1]
        }
        callback()
    }
}

// 格式化得到的音频信息后输出至excel
function formatFileInfos() {
    console.log("【准备输出文件信息】")
    let filesLength = fileInfos.length

    if (filesLength) {
        let resultTime = new Map()
        for (let fileItem of fileInfos) {
            if (fileItem.hasGetfileInfo) {
                // 判断结果中有没有这个人,再做相应处理
                let username = fileItem.username
                if (resultTime.has(username)) {
                    let resultTimeItemValue = resultTime.get(username)
                    resultTimeItemValue.total_time1 += parseInt(fileItem.fileTime)
                    resultTimeItemValue.total_time2 += fileItem.fileTime
                } else {
                    resultTime.set(username, {
                        total_time1: parseInt(fileItem.fileTime),  // 先取整再相加
                        total_time2: fileItem.fileTime   // 加完再取整
                    })
                }
            } else {
                console.warn('请重新执行程序');
                break;
            }

        }
        let excelName = moment().format('YYYY-MM-DD') + '_' +  Date.now()
        let excelData = [{
            name: 'sheet1',
            data: [
                [
                    '客户姓名',
                    '通话时间'
                ]
            ]
        }]
        // total_time2 取整
        for (let [_key, _value] of resultTime) {
            // console.log(_key, _value)
            _value.total_time2 = parseInt(_value.total_time2)
            excelData[0].data.push([
                _key, _value.total_time2
            ])
        }
        let excelBuffer = xlsx.build(excelData)
        // 写入
        let outputPath = `./build/${excelName}.xlsx`
        fs.writeFile(outputPath, excelBuffer, (err) => {
            if (err) {
                console.log(`【写入失败: 】${err}`)
            } else {
                console.log(`【已生成excel（在当前路径的build文件夹中）: 】${excelName}\.xlsx`)
            }
        })
    }
}



