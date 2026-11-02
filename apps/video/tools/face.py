"""Face and mouth boxes for a video, sampled at a fixed rate.

usage: face.py <video> <face_landmarker.task> [fps]
Prints JSON: {"fps", "width", "height", "samples": [{"t", "face": [x,y,w,h] | null, "mouth": [...] | null}]}
Boxes are normalised 0-1 in source-frame coordinates. Runs single-threaded on 540p frames.
"""
import json
import os
import sys

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("GLOG_minloglevel", "2")

import cv2  # noqa: E402
import mediapipe as mp  # noqa: E402
from mediapipe.tasks.python import BaseOptions, vision  # noqa: E402

cv2.setNumThreads(1)

# Outer and inner lip landmarks of the 478-point face mesh.
LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
        78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191]


def box(points):
    xs = [p.x for p in points]
    ys = [p.y for p in points]
    x0, y0 = max(0.0, min(xs)), max(0.0, min(ys))
    x1, y1 = min(1.0, max(xs)), min(1.0, max(ys))
    return [round(x0, 4), round(y0, 4), round(x1 - x0, 4), round(y1 - y0, 4)]


def main():
    video, model = sys.argv[1], sys.argv[2]
    rate = float(sys.argv[3]) if len(sys.argv) > 3 else 5.0
    cap = cv2.VideoCapture(video)
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    scale = 540.0 / min(width, height)
    options = vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model),
        running_mode=vision.RunningMode.VIDEO,
        num_faces=1,
    )
    samples = []
    with vision.FaceLandmarker.create_from_options(options) as landmarker:
        i, next_t = 0, 0.0
        while True:
            ok = cap.grab()
            if not ok:
                break
            t = i / src_fps
            i += 1
            if t + 1e-6 < next_t:
                continue
            next_t += 1.0 / rate
            ok, frame = cap.retrieve()
            if not ok:
                break
            small = cv2.resize(frame, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA)
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(small, cv2.COLOR_BGR2RGB))
            result = landmarker.detect_for_video(image, int(round(t * 1000)))
            if result.face_landmarks:
                lm = result.face_landmarks[0]
                samples.append({"t": round(t, 3), "face": box(lm), "mouth": box([lm[k] for k in LIPS])})
            else:
                samples.append({"t": round(t, 3), "face": None, "mouth": None})
    json.dump({"fps": rate, "width": width, "height": height, "samples": samples}, sys.stdout)


if __name__ == "__main__":
    main()
