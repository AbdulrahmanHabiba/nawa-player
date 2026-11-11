package expo.modules.musicmeta

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaMetadataRetriever
import android.media.MediaRecorder
import android.media.audiofx.NoiseSuppressor
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

class MusicMetaModule : Module() {
  private val SR = 44100
  @Volatile private var recording = false
  @Volatile private var gain = 2.0f
  @Volatile private var gateOn = true
  @Volatile private var gateThr = 0.02f
  private var ns: NoiseSuppressor? = null
  private var worker: Thread? = null
  private var outPath = ""
  private var seconds = 0.0

  override fun definition() = ModuleDefinition {
    Name("MusicMeta")
    Events("onMeter")

    AsyncFunction("read") { uri: String, key: String -> readMeta(uri, key) }
    AsyncFunction("startRecording") { path: String, isolation: Boolean, sens: Double -> startRec(path, isolation, sens) }
    AsyncFunction("stopRecording") { -> stopRec() }
    Function("setIsolation") { on: Boolean -> applyIsolation(on) }
    Function("setSensitivity") { v: Double -> applySens(v) }
  }

  // ---------- metadata + embedded artwork ----------
  private fun readMeta(uri: String, key: String): Map<String, String?>? {
    val ctx = appContext.reactContext ?: return null
    val r = MediaMetadataRetriever()
    return try {
      if (uri.startsWith("content://")) r.setDataSource(ctx, Uri.parse(uri)) else r.setDataSource(uri.removePrefix("file://"))
      var art: String? = null
      val pic = r.embeddedPicture
      if (pic != null) {
        val f = File(ctx.cacheDir, "art_$key.jpg")
        if (!f.exists()) f.writeBytes(pic)
        art = "file://" + f.absolutePath
      }
      mapOf(
        "title" to r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE),
        "artist" to r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST),
        "album" to r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM),
        "artwork" to art
      )
    } catch (e: Exception) { null } finally { try { r.release() } catch (_: Exception) {} }
  }

  // ---------- recorder with real noise suppression ----------
  private fun applySens(v: Double) {
    gain = (0.5 + v * 3.5).toFloat()          // 0.5x .. 4x input gain
    gateThr = (0.04 - v * 0.035).toFloat()    // higher sensitivity -> lower gate threshold
  }

  private fun applyIsolation(on: Boolean) {
    gateOn = on
    try { ns?.setEnabled(on) } catch (_: Exception) {}
  }

  private fun startRec(path: String, isolation: Boolean, sens: Double): Boolean {
    if (recording) return false
    applySens(sens)
    val minBuf = AudioRecord.getMinBufferSize(SR, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    val bufSize = max(minBuf, SR / 5 * 2)
    val rec = AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, SR, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, bufSize)
    if (rec.state != AudioRecord.STATE_INITIALIZED) { rec.release(); return false }
    if (NoiseSuppressor.isAvailable()) ns = NoiseSuppressor.create(rec.audioSessionId)
    applyIsolation(isolation)

    val raf = RandomAccessFile(File(path), "rw")
    raf.setLength(0)
    raf.write(ByteArray(44)) // header patched on stop
    outPath = path
    recording = true

    worker = Thread {
      val buf = ShortArray(bufSize / 2)
      val bb = ByteBuffer.allocate(buf.size * 2).order(ByteOrder.LITTLE_ENDIAN)
      var total = 0L
      rec.startRecording()
      while (recording) {
        val n = rec.read(buf, 0, buf.size)
        if (n <= 0) continue
        var sq = 0.0
        for (i in 0 until n) sq += buf[i].toDouble() * buf[i]
        val rms = sqrt(sq / n) / 32768.0
        val g = if (gateOn && rms < gateThr) gain * 0.1f else gain
        bb.clear()
        for (i in 0 until n) {
          val v = (buf[i] * g).coerceIn(-32768f, 32767f).toInt().toShort()
          bb.putShort(v)
        }
        raf.write(bb.array(), 0, n * 2)
        total += n * 2
        sendEvent("onMeter", mapOf("level" to min(1.0, rms * gain * 4.0)))
      }
      try { rec.stop() } catch (_: Exception) {}
      rec.release()
      try { ns?.release() } catch (_: Exception) {}
      ns = null
      raf.seek(0); raf.write(wavHeader(total)); raf.close()
      seconds = total / 2.0 / SR
    }.also { it.start() }
    return true
  }

  private fun stopRec(): Map<String, Any> {
    recording = false
    worker?.join(3000)
    return mapOf("path" to outPath, "seconds" to seconds)
  }

  private fun wavHeader(dataLen: Long): ByteArray {
    val b = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
    b.put("RIFF".toByteArray()); b.putInt((36 + dataLen).toInt()); b.put("WAVE".toByteArray())
    b.put("fmt ".toByteArray()); b.putInt(16); b.putShort(1); b.putShort(1)
    b.putInt(SR); b.putInt(SR * 2); b.putShort(2); b.putShort(16)
    b.put("data".toByteArray()); b.putInt(dataLen.toInt())
    return b.array()
  }
}
