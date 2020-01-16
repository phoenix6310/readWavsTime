let fs = require('fs')
let path = require('path')
let exec = require('child_process').exec;
let xlsx = require('node-xlsx')
let moment = require("moment")

let {
    entry, waitTime
} = require("./config.js")
// let filename = moment().format('YYYY-MM-DDHH:mm:ss')
// 成功
// fs.writeFile(`test.txt`, 'Node.js中文网', (err) => {
// 报错
// fs.writeFile(`${filename}.txt`, 'Node.js中文网', (err) => {
//     console.log(err)
// });
// let wav = require('wav')
// var wavFile = fs.createReadStream('./test/test.wav')
// var wavReader = new wav.Reader()
// wavReader.on('format', (format)=>{
//     console.log(format)
//     // { audioFormat: 17,
//     // endianness: 'LE',
//     // channels: 1,
//     // sampleRate: 8000,
//     // byteRate: 4055,
//     // blockAlign: 256,
//     // bitDepth: 4,
//     // signed: true }
// })
// wavFile.pipe(wavReader)
// fs.rename('E:/20200112ReadWav/b.txt', 'E:/20200112ReadWav/9999.txt', err=>{
//     console.log(err)
// })


let fileInfos = [{
    filePath: '',
    fileDirname: '',
    filename: ''
}]
fileInfos = []
let fileDirnames = new Set()
let usernames = new Set()
// 读目录
let readDirFun = (basePath, nextPath) => {
    let readPath = basePath
    if (!readPath) {
        readPath = nextPath
    }
    fs.readdir(readPath, (err, files) => {
        // console.log(files)
        if (files.length) {
            for (const filename of files) {
                let nextPath = `${readPath}\/${filename}`
                // console.log(nextPath)
                fs.stat(nextPath, (err, stats) => {
                    if (!err) {
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
                })
            }
        }
    })
}
// 可能存在bug
// 这里待优化  读完所有目录后执行，暂时未想到方法 
setTimeout(() => {
    // console.log(fileInfos, fileDirnames)
    // 假定此时已读出全部目录
    if (fileInfos.length) {
        for (const fileInfo of fileInfos) {
            // console.log(fileInfo)
            let fileDirname = fileInfo.fileDirname
            let filePath = fileInfo.filePath
            let filename = fileInfo.filename
            let cp = exec(`sox "${filePath}" -n stat`, (err, stdout, stderr) => {
                // console.log(filename, stderr.toString())
                let infoStr = stderr.toString()
                fileInfo.hasGetfileInfo = true
                fileInfo.infoStr = infoStr.replace(/( )*/g, '')
                // 这里待优化  提取音频时长，等用正则优化
                let startIndex = fileInfo.infoStr.indexOf('Length(seconds):')
                let endIndex = fileInfo.infoStr.indexOf('\r\nScaledby')
                fileInfo.fileTime = +fileInfo.infoStr.slice(startIndex, endIndex).split(':')[1]
            })
        }
    }
}, waitTime * 1000)
// 这里待优化 是否已读出所有wav得信息
// 定时器查询是否处理完成
let intervalTimer = setInterval(() => {
    let filesLength = fileInfos.length

    if (filesLength) {
        // 可能存在bug
        // 取最后一个wav得信息，据此来判断是否已读出所有wav得信息。
        let lastFileItem = fileInfos[filesLength - 1]
        if (lastFileItem.hasGetfileInfo) {
            clearInterval(intervalTimer)
            // console.log(fileInfos)
            // 计算时间
            let resultTime = new Map()
            for (let fileItem of fileInfos) {
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
            }
            // console.log(fileInfos)
            let excelName = moment().format('YYYY-MM-DD')
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
            let outputPath = `./dist/${excelName}.xlsx`
            fs.writeFile(outputPath, excelBuffer, (err) => {
                if (err) {
                    console.log(`写入失败: ${err}`)
                } else {
                    console.log(`已生成excel：${excelName}\.xlsx`)
                }
            })
        }
    }
}, 500);

readDirFun(entry)
