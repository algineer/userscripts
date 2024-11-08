// ==UserScript==
// @name         Download Minecraft Mods
// @namespace    https://github.com/algineer/
// @version      1.0.0
// @description  Download Minecraft Mods From Modrinth From User Collections
// @author       Algineer
// @match        https://modrinth.com/*
// @downloadURL  https://github.com/algineer/userscripts/raw/main/Modrinth/download_minecraft_mods.user.js
// @updateURL    https://github.com/algineer/userscripts/raw/main/Modrinth/download_minecraft_mods.user.js
// @grant        none
// @run-at       context-menu
// ==/UserScript==

(function() {
    const fetchData = async (api, payload = null, method = "GET") => {
        let url = api
      
        // If the method is GET and there's a payload, encode the payload and append it as a query parameter
        if (method === "GET" && payload !== null) {
          const key = Object.keys(payload)[0] // Get the first (and only) key from the payload
          const encodedValue = encodeURIComponent(JSON.stringify(payload[key])) // Encode the payload value
          url = `${api}?${key}=${encodedValue}` // Use the key as the query parameter
        }
      
        // Prepare the fetch options (headers, body) based on the method
        const options = {
          method: method,
          headers: {
            "Content-Type": "application/json", // We are sending JSON data for POST, PUT, etc.
          },
        }
      
        // If it's a POST or other method that requires a body, add the payload to the body
        if (method !== "GET" && payload !== null) {
          options.body = JSON.stringify(payload)
        }
      
        try {
          // Make the fetch request
          const response = await fetch(url, options)
      
          // Check if the response is okay (status code 200-299)
      
          // Parse the response JSON
          const data = await response.json()
      
          return data // Return the parsed data
        } catch (error) {
          console.error("Error in fetch operation:", error)
          throw error // Re-throw error after logging
        }
      }
      
      //process the fetched data
      const run = async () => {
        let collections = await fetchData(
          "https://api.modrinth.com/v3/user/OFlh8kiv/collections"
        )
        let project_ids = collections.find(
          (collection) => collection.name == "Client"
        ).projects
      
          let projects_data = await fetchData(
            "https://api.modrinth.com/v2/projects",
            (payload = { ids: project_ids })
          )
      
          let updated_projects = projects_data
            .filter((mod) => mod.game_versions.includes("1.21.3"))
            .map((mod) => mod.title)

          let pending_projects = projects_data
            .filter((mod) => !(mod.game_versions.includes("1.21.3")))
            .map((mod) => mod.title)

        console.log("Updated: ", updated_projects)
        console.log("Pending: ", pending_projects)

        let download_promt = window.prompt(`Would you like to download the updated mods? (Y/N)
                                          \n--------------------------------------------
                                          \n${updated_projects.join('\n')}`)

        if(download_promt == "Y"){
            let file_urls = []
            for (let id of project_ids) {
              let versions = await fetchData(
                `https://api.modrinth.com/v2/project/${id}/version`
              )
              file_urls.push(
                versions.filter(
                  (version) =>
                    version.loaders.includes("fabric") &&
                    version.game_versions.includes("1.21.3")
                )
              )
            }
            file_urls = file_urls
              .filter((version) => version.length > 0)
              .map((version) => version[0].files[0].url)
          
            window.file_urls = file_urls

            for(file of file_urls){
                window.open(file)
            }
        }
      }
      
      run()
})();