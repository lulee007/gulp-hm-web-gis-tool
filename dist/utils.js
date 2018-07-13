"use strict";function parseVersion(){var version=null,pomXml=fs.readFileSync("pom.xml","utf8");if(parseString(pomXml,function(err,result){result.project.version&&result.project.version[0]?version=result.project.version[0]:result.project.parent&&result.project.parent[0]&&result.project.parent[0].version&&result.project.parent[0].version[0]&&(version=result.project.parent[0].version[0])}),null===version)throw new Error("pom.xml is malformed. No version is defined");return version}function parseProjectName(){var pName=null,pomXml=fs.readFileSync("pom.xml","utf8");if(parseString(pomXml,function(err,result){result.project.artifactId&&result.project.artifactId[0]&&(pName=result.project.artifactId[0])}),null===pName)throw new Error("pom.xml is malformed. No artifactId is defined");return pName}function env(){var argv=process.argv;if(!argv||!argv[2])return void console.error("用法：gulp --port \r\n如：gulp --8080");var port=argv[2].replace("--",""),pages=getModuleNames();modules=pages.map(function(p){return{name:p,path:configWrap.config.webappDir+"app/"+p,tmpPath:configWrap.config.tmp+"app/"+p}});var prod=argv[4]&&argv[4].replace("--",""),version=parseVersion(),projectName=parseProjectName();return{modules:modules,prod:prod,port:port,projectVersion:version,projectName:projectName}}function normalFilesInModules(){var pages=getModuleNames(),files=coreConf.commonFile,commonIgnore=coreConf.commonIgnore.map(function(file){return"!"+configWrap.config.webappDir+file});for(var p in pages){var page=pages[p];files.push("app/"+page+"/**/*"),commonIgnore=commonIgnore.concat(coreConf.moduleIgnore.map(function(i){return"!"+configWrap.config.webappDir+"app/"+page+"/"+i}))}return files=files.map(function(file){return configWrap.config.webappDir+file}),files=files.concat(commonIgnore)}function moduleFiles(){var modules=env().modules,files=modules.map(function(m){return["**/*.component.js","**/*.scss","**/*.service.js","**/*.state.js","**/*.html"].map(function(type){return m.path+"/"+type})}).reduce(function(r,item){return r.concat(item)},[]);return files}function getModuleNames(){if(!_module_names){var argv=process.argv;if(!argv||!argv[3])throw log.error("用法：gulp copy:copyProject --tongli_wechat \r\n\t\t如：gulp copy:copyProject --PROJECT_NAME[,Name2,Name3]"),new Error("缺少必要参数");_module_names=argv[3].replace("--","").split(","),_module_names=_module_names.concat(coreConf.commonModules)}return _module_names}var fs=require("fs"),log=require("fancy-log"),configWrap=require("./config");module.exports={getEnv:env,parseVersion:parseVersion,parseProjectName:parseProjectName,moduleFiles:moduleFiles,normalFilesInModules:normalFilesInModules};var modules,coreConf=require("./project-common"),_module_names,parseString=require("xml2js").parseString;