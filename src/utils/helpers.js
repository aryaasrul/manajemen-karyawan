import dayjs from 'dayjs'
import 'dayjs/locale/id'

dayjs.locale('id')

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export const formatDate = (date, format = 'DD MMMM YYYY') => {
  return dayjs(date).format(format)
}

export const formatTime = (time, format = 'HH:mm') => {
  return dayjs(time).format(format)
}

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c // Distance in meters
}

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPhone = (phone) => {
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/
  return phoneRegex.test(phone)
}

export const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Selamat Pagi'
  if (hour < 18) return 'Selamat Siang'
  return 'Selamat Malam'
}

export const getAttendanceStatus = (attendance) => {
  if (!attendance) return { status: 'not_started', label: 'Belum Absen', color: 'gray' }
  
  if (attendance.check_in_time && attendance.check_out_time) {
    return { status: 'completed', label: 'Selesai', color: 'green' }
  }
  
  if (attendance.check_in_time) {
    return { status: 'in_progress', label: 'Sedang Bekerja', color: 'yellow' }
  }
  
  return { status: 'not_started', label: 'Belum Absen', color: 'gray' }
}

export const getWorkingMinutes = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0
  
  const start = dayjs(checkIn)
  const end = dayjs(checkOut)
  
  return Math.max(0, end.diff(start, 'minute'))
}

export const calculateEarnings = (minutes, ratePerMinute) => {
  return minutes * ratePerMinute
}
