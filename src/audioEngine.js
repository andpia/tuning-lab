export class AudioEngine {
  constructor({ onNoteStateChange, onPlaybackStateChange } = {}) {
    this.audioContext = null
    this.masterGain = null
    this.voices = new Map()
    this.noteCounters = new Map()
    this.sequenceTimers = []
    this.currentSequenceToken = null
    this.onNoteStateChange = onNoteStateChange ?? (() => {})
    this.onPlaybackStateChange = onPlaybackStateChange ?? (() => {})
  }

  async ensureContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = 0.7
      this.masterGain.connect(this.audioContext.destination)
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    return this.audioContext
  }

  markNoteState(noteId, isActive) {
    const currentCount = this.noteCounters.get(noteId) ?? 0
    const nextCount = isActive ? currentCount + 1 : Math.max(currentCount - 1, 0)

    if (nextCount === 0) {
      this.noteCounters.delete(noteId)
      if (currentCount > 0) {
        this.onNoteStateChange(noteId, false)
      }
      return
    }

    this.noteCounters.set(noteId, nextCount)
    if (currentCount === 0) {
      this.onNoteStateChange(noteId, true)
    }
  }

  clearSequenceTimers() {
    this.sequenceTimers.forEach((timerId) => clearTimeout(timerId))
    this.sequenceTimers = []
  }

  stopSequence() {
    this.currentSequenceToken = null
    this.clearSequenceTimers()
    this.onPlaybackStateChange(false)
  }

  async playNote(note, { duration = 1.1, waveform = 'triangle' } = {}) {
    const context = await this.ensureContext()
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    const now = context.currentTime
    const attack = 0.03
    const release = 0.18
    const voiceId = `${note.id}-${now}-${Math.random().toString(16).slice(2)}`

    oscillator.type = waveform
    oscillator.frequency.setValueAtTime(note.frequency, now)

    gainNode.gain.setValueAtTime(0.0001, now)
    gainNode.gain.exponentialRampToValueAtTime(0.22, now + attack)
    gainNode.gain.setValueAtTime(0.22, now + duration)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration + release)

    oscillator.connect(gainNode)
    gainNode.connect(this.masterGain)

    this.voices.set(voiceId, { oscillator, gainNode, noteId: note.id, stopped: false })
    this.markNoteState(note.id, true)

    oscillator.onended = () => {
      const voice = this.voices.get(voiceId)
      if (!voice || voice.stopped) {
        return
      }

      voice.stopped = true
      this.voices.delete(voiceId)
      this.markNoteState(note.id, false)
    }

    oscillator.start(now)
    oscillator.stop(now + duration + release)
  }

  async playChord(notes, options = {}) {
    this.stopSequence()
    await Promise.all(notes.map((note) => this.playNote(note, { duration: 1.6, ...options })))
  }

  async playSequence(notes, { stepDuration = 0.55, gap = 0.08 } = {}) {
    this.stopSequence()

    if (!notes.length) {
      return
    }

    try {
      await this.ensureContext()
    } catch {
      this.currentSequenceToken = null
      this.onPlaybackStateChange(false)
      return
    }

    const sequenceToken = Symbol('sequence')
    this.currentSequenceToken = sequenceToken
    this.onPlaybackStateChange(true)

    notes.forEach((note, index) => {
      const timerId = setTimeout(() => {
        if (this.currentSequenceToken !== sequenceToken) {
          return
        }

        this.playNote(note, { duration: stepDuration + 0.06 }).catch(() => {
          if (this.currentSequenceToken === sequenceToken) {
            this.stopSequence()
          }
        })

        if (index === notes.length - 1) {
          const completionTimer = setTimeout(() => {
            if (this.currentSequenceToken === sequenceToken) {
              this.currentSequenceToken = null
              this.onPlaybackStateChange(false)
            }
          }, (stepDuration + 0.3) * 1000)
          this.sequenceTimers.push(completionTimer)
        }
      }, index * (stepDuration + gap) * 1000)

      this.sequenceTimers.push(timerId)
    })
  }

  stopAll() {
    this.stopSequence()

    for (const [voiceId, voice] of this.voices.entries()) {
      if (voice.stopped) {
        continue
      }

      voice.stopped = true
      try {
        voice.gainNode.gain.cancelScheduledValues(0)
        voice.gainNode.gain.setValueAtTime(0.0001, this.audioContext?.currentTime ?? 0)
        voice.oscillator.stop()
      } catch {
        // Oscillators may already be stopping.
      }

      this.markNoteState(voice.noteId, false)
      this.voices.delete(voiceId)
    }
  }
}
