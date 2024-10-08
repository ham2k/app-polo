import { useState, useEffect } from 'react'

export function useDebounce(value, delayMs = 500) {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebounced(value)
        }, delayMs)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delayMs])

    return debounced
}
