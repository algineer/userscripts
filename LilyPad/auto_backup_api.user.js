// ==UserScript==
// @name         Minecraft Backup
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Starts when manually triggered from the right-click menu; repeats every 20 minutes
// @match        https://panel.lilypad.gg/*/*/files
// @downloadURL  https://github.com/algineer/userscripts/raw/main/LilyPad/auto_backup_api.user.js
// @updateURL    https://github.com/algineer/userscripts/raw/main/LilyPad/auto_backup_api.user.js
// @run-at       context-menu
// @grant        none
// ==/UserScript==

;(async () => {
	const apiPOST = async (url, options) => {
		try {
			const response = await fetch(url, {
				method: options?.method || 'POST',
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
					'x-xsrf-token': decodeURIComponent(getCookie('XSRF-TOKEN')),
				},
				body: options?.payload ? JSON.stringify(options.payload) : [],
			})
			if (options.method == 'PUT') return null

			const data = await response?.json()
			return data
		} catch (error) {
			console.error(error)
		}
	}

	const apiGET = async url => {
		try {
			const response = await fetch(url)
			const data = await response.json()
			return data
		} catch (error) {
			console.error(error)
		}
	}

	const getCookie = name => {
		const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
		if (match) return match[2]
		return null
	}

	const runBackupSequence = async uuid => {
		try {
			console.log('🚀 Running backup script')

			const playersOnline = (await apiGET(`/api/client/servers/${uuid}/minecraft-players`))
				.online

			if (!playersOnline) return

			const archiveData = await apiPOST(`/api/client/servers/${uuid}/files/compress`, {
				payload: {root: '/', files: ['world']},
			})

			const archiveFile = archiveData.attributes.name

			const moveRequest = await apiPOST(`/api/client/servers/${uuid}/files/rename`, {
				method: 'PUT',
				payload: {
					root: '/',
					files: [
						{
							from: archiveFile,
							to: `backups/${archiveFile}`,
						},
					],
				},
			})

			console.log('✅ Backup sequence completed.')

			return true
		} catch (err) {
			console.error('❌ Backup sequence error:', err)
			return false
		}
	}

	// Run immediately and on interval

	const run = async () => {
		const minutes = 20

		const url = window.location.href
		const match = url.match(/\/server\/([^/]+)/)
		const serverId = match ? match[1] : null

		if (!serverId) return
		//else alert(`🔁 Backup script started. Will repeat every ${minutes} minutes.`)

		const serverData = await apiGET(`/api/client/servers/${serverId}`)
		const uuid = serverData.attributes.uuid

		// Get schedule IDs once
		const schedules = await apiGET(`/api/client/servers/${uuid}/schedules?include[]=tasks`)
		const successSchedule = schedules.data.find(s => s.attributes.name === 'Backup Successful')
		const failSchedule = schedules.data.find(s => s.attributes.name === 'Backup Failed')

		const successId = successSchedule?.attributes.id
		const failId = failSchedule?.attributes.id

		// Define recurring function
		const performBackup = async () => {
			const result = await runBackupSequence(uuid)

			if (result && successId) {
				await apiPOST(`/api/client/servers/${serverId}/schedules/${successId}/execute`, {})
				console.log('✅ Backup Successful')
			} else if (result == undefined) {
				console.warn('⚠️ No Players Online')
				// alert('⚠️ No Players Online')
			} else if (!result && failId) {
				await apiPOST(`/api/client/servers/${serverId}/schedules/${failId}/execute`, {})
				//alert('❌ Backup Failed')
				console.warn('❌ Backup Failed')
			}
		}

		// Run immediately and then on interval
		await performBackup()
		setInterval(performBackup, minutes * 60 * 1000)
	}

	run()
})()
