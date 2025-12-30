"use client"

import { useEffect } from "react"

export function ContextMenuHandler() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // The requirement is to disable context menu for the specific domains
      const hostname = window.location.hostname
      const targetDomains = ["www.livederivdataanalysis.com", "livederivdataanalysis.com", "localhost"]

      if (targetDomains.includes(hostname)) {
        e.preventDefault()
        alert("Context is disabled by livederivdataanalysis.com Management")
      }
    }

    window.addEventListener("contextmenu", handleContextMenu)

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [])

  return null
}
