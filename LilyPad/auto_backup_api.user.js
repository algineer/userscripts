// ==UserScript==
// @name         Lilypad Backup (API Trigger)
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Starts when manually triggered from the right-click menu; repeats every 20 minutes
// @match        https://panel.lilypad.gg/*/*/files
// @downloadURL  https://github.com/algineer/userscripts/raw/main/LilyPad/auto_backup_api.user.js
// @updateURL    https://github.com/algineer/userscripts/raw/main/LilyPad/auto_backup_api.user.js
// @run-at       context-menu
// @grant        none
// ==/UserScript==

;(async () => {
	const apiPOSTRequest = async (url, options) => {
		try {
			const response = await fetch(url, {
				method: options.method,
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
					'x-xsrf-token': decodeURIComponent(getCookie('XSRF-TOKEN')),
				},
				body: JSON.stringify(options.payload),
			})
			if (options.method == 'PUT') return null

			const data = await response?.json()
			return data
		} catch (error) {
			console.error(error)
		}
	}

	const apiGETRequest = async url => {
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

			const playersOnline = (
				await apiGETRequest(`/api/client/servers/${uuid}/minecraft-players`)
			).online

			if (!playersOnline) return

			const archiveData = await apiPOSTRequest(`/api/client/servers/${uuid}/files/compress`, {
				method: 'POST',
				payload: {root: '/', files: ['world']},
			})

			const archiveFile = archiveData.attributes.name

			const moveRequest = await apiPOSTRequest(`/api/client/servers/${uuid}/files/rename`, {
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
		} catch (err) {
			console.error('❌ Backup sequence error:', err)
		}
	}

	// Run immediately and on interval

	const run = async () => {
		const minutes = 20

		alert(`🔁 Backup script started. Will repeat every ${minutes} minutes.`)

		const url = window.location.href
		const match = url.match(/\/server\/([^/]+)/)
		const serverId = match ? match[1] : null

		if (!serverId) return

		const uuid = (await apiGETRequest(`/api/client/servers/${serverId}`)).attributes.uuid

		runBackupSequence(uuid)
		//setInterval(runBackupSequence, minutes * 60 * 1000)
	}

	run()
})()
