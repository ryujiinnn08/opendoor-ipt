import { createContext, useContext } from 'react'
export const TourContext = createContext(null)
export const useCandidateTour = () => useContext(TourContext)
