// ==UserScript==
// @name         Lilypad Backup (Manual Trigger)
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Starts when manually triggered from the right-click menu; repeats every 30 minutes
// @match        https://panel.lilypad.gg/*/*/files
// @downloadURL  https://github.com/algineer/userscripts/raw/main/LilyPad/auto_backup.user.js
// @updateURL    https://github.com/algineer/userscripts/raw/main/LilyPad/auto_backup.user.js
// @run-at       context-menu
// @grant        none
// ==/UserScript==

;(function () {
	alert('🔁 Backup script started. Will repeat every 30 minutes.')

	function waitForElement(getterFn, timeout = 5000, interval = 100) {
		return new Promise((resolve, reject) => {
			const start = Date.now()
			const check = () => {
				const el = getterFn()
				if (el) return resolve(el)
				if (Date.now() - start >= timeout) return reject('Element not found')
				setTimeout(check, interval)
			}
			check()
		})
	}

	async function runBackupSequence() {
		try {
			console.log('🚀 Running backup script')

			const worldCheckbox = await waitForElement(() =>
				document.querySelector('input[type="checkbox"][value*="world"]')
			)
			worldCheckbox.click()

			const compressButton = await waitForElement(
				() =>
					[...document.querySelectorAll('button')].filter(el =>
						el.textContent.includes('Compress')
					)[0]
			)
			compressButton.click()

			// Wait for compresion to complete and worldCheckbox is false
			await waitForElement(() => {
				const cb = worldCheckbox
				return cb && !cb.checked ? cb : null
			})

			const archiveCheckbox = await waitForElement(() =>
				document.querySelector('input[type="checkbox"][value*="archive"]')
			)
			archiveCheckbox.click()

			//before move need to make sure worldCheckbox.checked is false and if not wait for it to be

			let moveButton = await waitForElement(
				() =>
					[...document.querySelectorAll('button')].filter(el =>
						el.textContent.includes('Move')
					)[0]
			)
			moveButton.click()

			const backupsBtn = await waitForElement(() =>
				[...document.querySelectorAll('span')].find(el =>
					el.textContent.includes('backups')
				)
			)
			backupsBtn.click()

			moveButton = await waitForElement(
				() =>
					[...document.querySelectorAll('button')].filter(el =>
						el.textContent.includes('Move')
					)[1]
			)
			moveButton.click()

			console.log('✅ Backup sequence completed.')
		} catch (err) {
			console.error('❌ Backup sequence error:', err)
		}
	}

	// Run immediately and on interval
	runBackupSequence()
	setInterval(runBackupSequence, 20 * 60 * 1000) // Every 30 minutes
})()
