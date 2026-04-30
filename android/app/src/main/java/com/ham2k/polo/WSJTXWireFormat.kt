package com.ham2k.polo

import java.io.DataOutputStream

internal data class WSJTXQDateTimeParts(
  val julianDay: Long,
  val millisSinceUtcMidnight: Int,
  val timeSpec: Int
)

internal object WSJTXWireFormat {
  // Julian day number for 1970-01-01 UTC, which is Unix epoch day zero.
  private const val UNIX_EPOCH_JULIAN_DAY = 2_440_588L
  private const val MILLIS_PER_DAY = 86_400_000L
  private const val UTC_TIME_SPEC = 1

  fun writeUTF8(writer: DataOutputStream, value: String?) {
    if (value == null) {
      writer.writeInt(-1)
      return
    }

    val bytes = value.toByteArray(Charsets.UTF_8)
    writer.writeInt(bytes.size)
    writer.write(bytes)
  }

  fun qDateTimeParts(millis: Long): WSJTXQDateTimeParts {
    return WSJTXQDateTimeParts(
      julianDay = UNIX_EPOCH_JULIAN_DAY + Math.floorDiv(millis, MILLIS_PER_DAY),
      millisSinceUtcMidnight = Math.floorMod(millis, MILLIS_PER_DAY).toInt(),
      timeSpec = UTC_TIME_SPEC
    )
  }

  fun writeQDateTime(writer: DataOutputStream, millis: Long) {
    // WSJT-X type 5 uses Qt's QDateTime stream layout, not a raw Unix timestamp.
    val parts = qDateTimeParts(millis)
    writer.writeLong(parts.julianDay)
    writer.writeInt(parts.millisSinceUtcMidnight)
    writer.writeByte(parts.timeSpec)
  }
}
