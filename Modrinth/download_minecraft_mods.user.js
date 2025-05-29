// ==UserScript==
// @name         Minecraft Mods
// @namespace    https://github.com/algineer/
// @version      2.2.0
// @description  Download Minecraft Mods From Modrinth From User Collections
// @author       Algineer
// @match        https://modrinth.com/*
// @downloadURL  https://github.com/algineer/userscripts/raw/main/Modrinth/download_minecraft_mods.user.js
// @updateURL    https://github.com/algineer/userscripts/raw/main/Modrinth/download_minecraft_mods.user.js
// @grant        none
// @run-at       context-menu
// ==/UserScript==

;(function () {
	const config = {
		gameVersion: '1.21.5',
		userId: 'OFlh8kiv', // User ID for Modrinth API calls
		collectionName: 'Client', // Collection name to filter projects
	}

	const installedProjects = localStorage.installedProjects
		? JSON.parse(localStorage.installedProjects)
		: {}
	const installedGameVersion = localStorage.installedGameVersion
		? JSON.parse(localStorage.installedGameVersion)
		: {gameVersion: null}

	const fetchData = async (url, payload = null, method = 'GET') => {
		const options = {
			method: method,
			headers: {
				'Content-Type': 'application/json', // We are sending JSON data for POST, PUT, etc.
			},
		}

		if (payload && method !== 'GET') {
			options.body = JSON.stringify(payload)
		}

		if (payload && method === 'GET') {
			const key = Object.keys(payload)[0] // Get the first (and only) key from the payload
			const encodedValue = encodeURIComponent(JSON.stringify(payload[key]))
			url = `${url}?${key}=${encodedValue}` // Use the key as the query parameter
		}

		try {
			const response = await fetch(url, options)

			if (!response.ok) {
				throw new Error(`Error fetching ${url}: ${response.statusText}`)
			}

			const data = await response.json()

			return data
		} catch (error) {
			console.error('Error in fetch operation:', error)
			throw error // Re-throw error after logging
			return null
		}
	}

	const compareProjects = (projectsData, installedProjects) => {
		const notInstalled = []
		const isInstalled = []
		const newVersions = []

		// Compare project_data to installedProjects
		for (const [id, data] of Object.entries(projectsData)) {
			if (!installedProjects[id]) {
				notInstalled.push({id, title: data.title, version: data.version, url: data.url})
			} else if (installedProjects[id].version !== data.version) {
				newVersions.push({
					id,
					title: data.title,
					version: data.version,
					installedVersion: installedProjects[id].version,
					url: data.url,
				})
				isInstalled.push({
					id,
					title: data.title,
					installedVersion: installedProjects[id].version,
				})
			} else {
				isInstalled.push({
					id,
					title: data.title,
					installedVersion: installedProjects[id].version,
				})
			}
		}

		return {notInstalled, isInstalled, newVersions}
	}

	const updateLocalStroage = updates => {
		for (let items of updates) {
			if (items[1].length > 0) {
				items[1].forEach(({id, title, version}) => {
					installedProjects[id] = {title, version}
					localStorage[items[0]] = JSON.stringify(installedProjects)
				})
			} else {
				localStorage[items[0]] = JSON.stringify(items[1])
			}
		}
	}
	const download = files => {
		for (let file of files) window.open(file)
	}

	//process the fetched data
	const run = async () => {
		const collections = await fetchData(
			`https://api.modrinth.com/v3/user/${config.userId}/collections`
		)
		const collection = collections.find(c => c.name === config.collectionName)
		const projectIds = collection ? collection.projects : []

		const projects = await fetchData(
			'https://api.modrinth.com/v2/projects',
			(payload = {ids: projectIds})
		)

		window.projects = projects

		const projectsVersions = await Promise.all(
			projectIds.map(async id => {
				try {
					// Fetch version data for the current project ID
					const version = await fetchData(
						`https://api.modrinth.com/v2/project/${id}/version`
					)

					// If version is returned, filter it for Fabric loader and the correct game version
					if (Array.isArray(version)) {
						return version.filter(
							v =>
								v.loaders.includes('fabric') &&
								v.game_versions.includes(config.gameVersion)
						)
					} else {
						console.warn(`Unexpected version data for project ID ${id}:`, version)
						return [] // Return an empty array if version is not as expected
					}
				} catch (error) {
					console.error(`Error fetching versions for project ID ${id}:`, error)
					return [] // Return an empty array in case of an error
				}
			})
		)

		let updatedVersions = projectsVersions
			.filter(version => version.length > 0)
			.map(version => version[0])
			.map(data => ({
				id: data.project_id,
				version: data.version_number,
				url: data.files[0].url,
			}))

		let updatedProjects = projects
			.filter(mod => mod.game_versions.includes(config.gameVersion))
			.map(mod => ({id: mod.id, title: mod.title}))
			.sort((a, b) => a.title.localeCompare(b.title))

		let pendingProjects = projects
			.filter(mod => !mod.game_versions.includes(config.gameVersion))
			.map(mod => ({id: mod.id, title: mod.title}))
			.sort((a, b) => a.title.localeCompare(b.title))

		const projectsData = updatedProjects.reduce((acc, {id, title}) => {
			acc[id] = {title}
			return acc
		}, {})

		// Add version info if available
		updatedVersions.forEach(({id, version, url}) => {
			if (projectsData[id]) {
				projectsData[id].version = version
				projectsData[id].url = url
			} else {
				console.warn(`No project data found for ID: ${id}`)
			}
		})

		const {notInstalled, isInstalled, newVersions} = compareProjects(
			projectsData,
			installedProjects
		)

		let newGameVersionPrompt = ''
		let notInstalledPrompt = ''
		let newVersionsPrompt = ''
		if (installedGameVersion.gameVersion != config.gameVersion) {
			if (updatedProjects.length == 0) {
				alert(
					`
							No mods avalible for ${config.gameVersion}!
							-------------------------------------------
							Pending Mods:
							${pendingProjects.length > 0 ? pendingProjects.map(mod => `  • ${mod.title}`).join('\n') : 'None'}
							`.replace(/\t/g, '')
				)
			} else {
				newGameVersionPrompt = window.prompt(
					`
						No mods for ${config.gameVersion} have been installed.
						Would you like to download all following available mods? (Y/N)
						-------------------------------------------
						Available Mods:
						${updatedProjects.length > 0 ? updatedProjects.map(mod => `  • ${mod.title}`).join('\n') : 'None'}
						-------------------------------------------
						Pending Mods:
						${pendingProjects.length > 0 ? pendingProjects.map(mod => `  • ${mod.title}`).join('\n') : 'None'}
						`.replace(/\t/g, '')
				)
			}
		} else {
			if (notInstalled.length == 0 && newVersions.length == 0) {
				alert(
					`
							All avalible mods for ${config.gameVersion} are updated and installed!
							-------------------------------------------
							Pending Mods:
							${pendingProjects.length > 0 ? pendingProjects.map(mod => `  • ${mod.title}`).join('\n') : 'None'}
							`.replace(/\t/g, '')
				)
			} else {
				if (notInstalled.length > 0) {
					notInstalledPrompt = window.prompt(
						`
								The following mods for ${config.gameVersion} have not been installed.
								Would you like to download? (Y/N)
								-------------------------------------------
								Not Installed Mods:
								${notInstalled.map(mod => `  • ${mod.title}`).join('\n')}
								-------------------------------------------
								Installed Mods:
								${isInstalled.length > 0 ? isInstalled.map(mod => `  • ${mod.title}`).join('\n') : 'None'}
								`.replace(/\t/g, '')
					)
				}
				if (newVersions.length > 0) {
					newVersionsPrompt = window.prompt(
						`
								New versions avalible for following installed mods.
								Would you like to download the updated version? (Y/N)
								-------------------------------------------
								Updated Mods:
								${newVersions
									.map(
										mod => `  • ${mod.title} 
									     - ${mod.installedVersion} --> ${mod.version}`
									)
									.join('\n')}
								`.replace(/\t/g, '')
					)
				}
			}
		}

		if (newGameVersionPrompt.toUpperCase() == 'Y') {
			const files = []
			for (let key in projectsData) {
				if (projectsData.hasOwnProperty(key)) {
					files.push(projectsData[key].url)
					delete projectsData[key].url
				}
			}
			updateLocalStroage([
				['installedGameVersion', {gameVersion: config.gameVersion}],
				['installedProjects', projectsData],
			])
			download(files)
		} else {
			if (notInstalledPrompt.toUpperCase() == 'Y') {
				updateLocalStroage([['installedProjects', notInstalled]])

				download(notInstalled.map(item => item.url))
			}
			if (newVersionsPrompt.toUpperCase() == 'Y') {
				updateLocalStroage([['installedProjects', newVersions]])

				download(newVersions.map(item => item.url))
			}
		}
	}
	run()
})()

//'{"gameVersion":"1.21.3"}'
