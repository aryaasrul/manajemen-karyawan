import { useState } from 'react'
import { MapPin, Settings, X } from 'lucide-react'
import QuickOfficeSetup from './QuickOfficeSetup'

const OfficeLocationAlert = ({ settings, onDismiss }) => {
  const [showQuickSetup, setShowQuickSetup] = useState(false)
  
  const hasOfficeLocation = settings?.office_latitude && settings?.office_longitude

  if (hasOfficeLocation) return null

  return (
    <>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <MapPin className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Lokasi Kantor Belum Diatur
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Untuk menggunakan fitur absensi dengan GPS, Anda perlu mengatur lokasi kantor terlebih dahulu.
              </p>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => setShowQuickSetup(true)}
                className="bg-yellow-100 px-3 py-2 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-200"
              >
                Setup Sekarang
              </button>
              <a
                href="/admin/settings"
                className="bg-white px-3 py-2 rounded-md text-sm font-medium text-yellow-800 hover:bg-gray-50 border border-yellow-200"
              >
                <Settings className="h-4 w-4 inline mr-1" />
                Pengaturan Lengkap
              </a>
            </div>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={onDismiss}
              className="text-yellow-400 hover:text-yellow-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <QuickOfficeSetup
        isOpen={showQuickSetup}
        onClose={() => setShowQuickSetup(false)}
        onSuccess={() => {
          // Refresh page atau update state
          window.location.reload()
        }}
      />
    </>
  )
}

export default OfficeLocationAlert