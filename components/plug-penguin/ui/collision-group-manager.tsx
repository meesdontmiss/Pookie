'use client'

import { useState } from 'react'
import { Button, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@nextui-org/react'
import { useCollisionShape } from '@/components/game/collision-shape-context'
import { Save, Upload, Download, FolderDown, FileDown } from 'lucide-react'
import { 
  createCollisionGroup, 
  createCollisionMap, 
  exportCollisionMap, 
  importCollisionMap, 
  exportToFile,
  generateExportFilename,
  exportToShape
} from '@/components/game/collision-shape-utils'

export function CollisionGroupManager() {
  const { placedShapes, updateShapes } = useCollisionShape()
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [author, setAuthor] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')

  const handleExportAll = () => {
    const group = createCollisionGroup(
      placedShapes,
      groupName || 'Default Group',
      groupDescription,
      {
        author,
        notes,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
      }
    )

    const map = createCollisionMap(
      [group],
      groupName || 'Default Map',
      {
        author,
        description: groupDescription,
        notes,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
      }
    )

    const jsonData = exportCollisionMap(map)
    exportToFile(jsonData, generateExportFilename(map.name))
    setIsExportModalOpen(false)
  }

  const handleExportSelected = (shapes: typeof placedShapes) => {
    const group = createCollisionGroup(
      shapes,
      groupName || 'Selected Shapes',
      groupDescription,
      {
        author,
        notes,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
      }
    )

    const map = createCollisionMap(
      [group],
      groupName || 'Selected Shapes',
      {
        author,
        description: groupDescription,
        notes,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
      }
    )

    const jsonData = exportCollisionMap(map)
    exportToFile(jsonData, generateExportFilename(map.name))
    setIsExportModalOpen(false)
  }

  const handleImport = async () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        const text = await file.text()
        const map = importCollisionMap(text)
        
        // Import all shapes from all groups
        const newShapes = map.groups.flatMap(group => 
          group.shapes.map(exportToShape)
        )

        // Add to existing shapes
        updateShapes([...placedShapes, ...newShapes])
        setIsImportModalOpen(false)
      }

      input.click()
    } catch (error) {
      console.error('Error importing collision map:', error)
      // Handle error (show toast/notification)
    }
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 flex gap-2">
        <Button
          color="primary"
          startContent={<Upload className="w-4 h-4" />}
          onClick={() => setIsImportModalOpen(true)}
        >
          Import
        </Button>
        <Button
          color="primary"
          startContent={<Save className="w-4 h-4" />}
          onClick={() => setIsExportModalOpen(true)}
        >
          Export
        </Button>
      </div>

      {/* Export Modal */}
      <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Export Collision Map</ModalHeader>
          <ModalBody>
            <Input
              label="Group Name"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <Textarea
              label="Description"
              placeholder="Enter description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
            />
            <Input
              label="Author"
              placeholder="Enter author name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
            <Input
              label="Tags"
              placeholder="Enter tags (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <Textarea
              label="Notes"
              placeholder="Enter additional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              color="primary"
              startContent={<FolderDown className="w-4 h-4" />}
              onClick={() => handleExportAll()}
            >
              Export All
            </Button>
            <Button
              color="primary"
              startContent={<FileDown className="w-4 h-4" />}
              onClick={() => handleExportSelected(placedShapes.filter(shape => shape.id))}
            >
              Export Selected
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Import Collision Map</ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-400">
              Select a collision map file to import. The shapes will be added to your current scene.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="primary"
              startContent={<Upload className="w-4 h-4" />}
              onClick={handleImport}
            >
              Select File
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
} 