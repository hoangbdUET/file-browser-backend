const fs = require('fs');
const {s3} = require('../_aws');

const withFs = dir => {
	return new Promise((resolve, reject) => {
		fs.lstat(dir, (err, stat) => {
			if (err) return reject(err);
			
			// return resolve(stat)
			
			return resolve({
				isDirectory: () => stat.isDirectory(),
				isFile: () => stat.isFile(),
				size: stat.size,
				LastModified: stat.mtime,
				metaData: ""
			})
		})
	})
};

const withS3 = (bucket, dir) => {
	return new Promise(async (resolve, reject) => {
		
		//special case
		if (dir === '' || dir === '/') return resolve({
			isDirectory: () => true,
			isFile: () => false
		});
		
		//default of s3 dont use / at start
		//but in fs system use /
		if (dir[0] === '/' || dir[0] === '//') dir = dir.substr(1);
		try {
			const params = {Bucket: bucket, Prefix: dir};
			// console.log(params);
			const data = await s3.listObjectsV2(params).promise();
			// console.log("data list object === ", data.Contents);
			// console.log(dir);
			const foundContent = data.Contents.find(
				content => {
					// console.log("compares ", content.Key, "||", dir, "||");
					// let rs = content.Key === dir || content.Key === dir + '/';
					// loi khi thu muc khong co file con
					// let rs = content.Key.includes(dir) || content.Key.includes(dir + '/');
					let rs = content.Key === (dir) || content.Key === (dir + '/');
					return rs
				}
			);
			// foundContent.Key = dir + '/';
			// console.log("=======", !foundContent, foundContent);
			// console.log(foundContent);
			// if (!foundContent) return reject(new Error('Directory is not founded'));
			if (!foundContent) return resolve(null);
			// console.log("found content ===", foundContent);
			// to sync with version that using fs
			// folder end with /
			// file doesnt end with /
			let metaData = (await s3.headObject({Bucket: bucket, Key: foundContent.Key}).promise()).Metadata;
			if (metaData.encodingtype === "base64") {
				for (let key in metaData) {
					// console.log(key)
					if (key !== "encodingtype") {
						metaData[key] = (new Buffer(metaData[key], 'base64')).toString("utf8");
					}
				}
			}
			let secondSlash = dir.indexOf("/", dir.indexOf("/") + 1);
			// console.log(secondSlash);
			// console.log(dir);
			metaData.location = dir.substring(secondSlash);
			const stat = {
				isFile: () => {
					return foundContent.Key[foundContent.Key.length - 1] !== '/'
				},
				isDirectory: () => {
					return foundContent.Key[foundContent.Key.length - 1] === '/'
				},
				metaData: metaData,
				size: foundContent.Size,
				modifiedDate: foundContent.LastModified
			};
			
			// calculate size
			// because s3 treat folder as an empty object
			// therefore folder will have 0kb size
			
			return resolve(stat);
			
		} catch (error) {
			reject(error)
		}
	})
};

// withS3('test-quang', 'folder').then(data => console.log(data))

module.exports = (dir, options) => {
	if (options && options.s3) {
		if (!options.bucket) return Promise.reject(new Error('Bucket is required'));
		
		return withS3(options.bucket, dir)
	}
	
	return withFs(dir)
};
