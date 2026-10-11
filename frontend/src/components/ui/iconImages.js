// Icons from Icons8 (https://icons8.com), style "Fluency Systems Regular", used under the free
// licence, which asks for the "Icons by Icons8" link in the footer. The PNGs are used as masks
// over the text colour, so an icon takes the colour of the text around it (purple links, amber
// accommodations, the high-contrast theme). Each icon is decorative: the text next to it
// carries the meaning. To add one, download it in the same style from icons8.com into
// src/assets/icons/ and add it below.
import alert from '../../assets/icons/box-important.png'
import calendar from '../../assets/icons/calendar.png'
import chat from '../../assets/icons/chat.png'
import check from '../../assets/icons/checkmark.png'
import circle from '../../assets/icons/circle.png'
import clock from '../../assets/icons/clock.png'
import people from '../../assets/icons/conference-call.png'
import door from '../../assets/icons/door-opened.png'
import pencil from '../../assets/icons/edit.png'
import chevronDown from '../../assets/icons/expand-arrow.png'
import info from '../../assets/icons/info.png'
import lock from '../../assets/icons/lock.png'
import minus from '../../assets/icons/minus.png'
import monitor from '../../assets/icons/monitor.png'
import cross from '../../assets/icons/multiply.png'
import refresh from '../../assets/icons/refresh.png'

export const IMAGES = {
  alert,
  calendar,
  chat,
  check,
  'chevron-down': chevronDown,
  circle,
  clock,
  cross,
  door,
  info,
  lock,
  minus,
  monitor,
  pencil,
  people,
  refresh,
}

export const ICON_NAMES = Object.keys(IMAGES)
