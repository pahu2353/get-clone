'use client'

export function TypingAnimation() {
  return (
    <div className="flex items-center space-x-1">
      <span className="text-lg animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
      <span className="text-lg animate-bounce" style={{ animationDelay: '200ms' }}>.</span>
      <span className="text-lg animate-bounce" style={{ animationDelay: '400ms' }}>.</span>
    </div>
  )
}