"""Person matte for a video: one 8-bit mask frame per video frame, for the explainer head break-out.

usage: matte.py <video> <selfie_segmenter.tflite> <width>
Writes raw gray frames (width x height, height keeping the aspect, even) to stdout and progress to stderr.
The mask is smoothed over time (an exponential moving average over about 3 frames) so edges don't
flicker, softly thresholded, then feathered by about 2 px. Runs single-threaded.
"""
import os
import sys

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("GLOG_minloglevel", "2")

import cv2  # noqa: E402
import mediapipe as mp  # noqa: E402
import numpy as np  # noqa: E402
from mediapipe.tasks.python import BaseOptions, vision  # noqa: E402

cv2.setNumThreads(1)

EMA = 0.5
LO, HI = 0.35, 0.65


def main():
    video, model, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
    cap = cv2.VideoCapture(video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    height = round(src_h * width / src_w / 2) * 2
    options = vision.ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=model),
        running_mode=vision.RunningMode.VIDEO,
        output_confidence_masks=True,
        output_category_mask=False,
    )
    out = sys.stdout.buffer
    smooth = None
    i = 0
    with vision.ImageSegmenter.create_from_options(options) as segmenter:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            small = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(small, cv2.COLOR_BGR2RGB))
            masks = segmenter.segment_for_video(image, int(round(i * 1000 / fps))).confidence_masks
            # The selfie model gives one person mask; multiclass models put the background first.
            person = masks[0].numpy_view() if len(masks) == 1 else 1.0 - masks[0].numpy_view()
            person = cv2.resize(np.asarray(person, dtype=np.float32).squeeze(), (width, height), interpolation=cv2.INTER_LINEAR)
            smooth = person if smooth is None else EMA * smooth + (1 - EMA) * person
            k = np.clip((smooth - LO) / (HI - LO), 0.0, 1.0)
            alpha = cv2.GaussianBlur(k * k * (3 - 2 * k), (5, 5), 0)
            out.write((alpha * 255).astype(np.uint8).tobytes())
            i += 1
            if i % 300 == 0:
                print(f"{i} frames", file=sys.stderr, flush=True)
    print(f"{i} frames {width}x{height} @ {fps:.3f}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
