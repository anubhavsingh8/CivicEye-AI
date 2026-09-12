from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
from PIL import Image
from datetime import datetime
import os
import json

app = Flask(__name__)
CORS(app)

print("Loading CivicEye AI...")

# ==============================
# AI MODEL
# ==============================

classifier = pipeline(
    "zero-shot-image-classification",
    model="openai/clip-vit-base-patch32"
)

print("CivicEye AI loaded successfully!")


# ==============================
# CIVIC ISSUE LABELS
# ==============================

LABELS = [
    "a pothole or damaged road",
    "garbage or waste on the road",
    "a damaged streetlight",
    "water leakage or water pipe damage",
    "a normal road with no civic issue"
]


# ==============================
# HOME
# ==============================

@app.route("/")
def home():

    return "CivicEye AI Server is Running!"


# ==============================
# AI IMAGE ANALYSIS
# ==============================

@app.route("/analyze", methods=["POST"])
def analyze():

    if "image" not in request.files:

        return jsonify({
            "error": "No image uploaded"
        }), 400

    image_file = request.files["image"]

    try:

        # Open uploaded image
        image = Image.open(image_file).convert("RGB")

        # AI prediction
        results = classifier(
            image,
            candidate_labels=LABELS
        )

        # Best prediction
        best = results[0]

        issue = best["label"]

        confidence = round(
            best["score"] * 100,
            2
        )

        # ==============================
        # PRIORITY CALCULATION
        # ==============================

        if (
            "pothole" in issue
            or "damaged road" in issue
        ):

            severity = "High"

        elif "water leakage" in issue:

            severity = "High"

        elif "streetlight" in issue:

            severity = "Medium"

        elif "garbage" in issue:

            severity = "Medium"

        else:

            severity = "Low"


        # Send result to frontend
        return jsonify({

            "issue": issue,

            "confidence": confidence,

            "severity": severity

        })


    except Exception as e:

        return jsonify({

            "error": str(e)

        }), 500


# ==============================
# SUBMIT CITIZEN REPORT
# ==============================

@app.route("/submit-report", methods=["POST"])
def submit_report():

    try:

        data = request.get_json()

        if not data:

            return jsonify({

                "success": False,

                "error":
                    "No report data received"

            }), 400


        # ==============================
        # CREATE REPORT
        # ==============================

        report = {

            "report_id":
                "CE-" +
                datetime.now().strftime(
                    "%Y%m%d%H%M%S"
                ),

            "issue":
                data.get(
                    "issue",
                    "Unknown"
                ),

            "confidence":
                data.get(
                    "confidence",
                    0
                ),

            "priority":
                data.get(
                    "priority",
                    "Unknown"
                ),

            "latitude":
                data.get(
                    "latitude"
                ),

            "longitude":
                data.get(
                    "longitude"
                ),

            "status":
                "Submitted",

            "date":
                datetime.now().strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
        }


        # ==============================
        # READ EXISTING REPORTS
        # ==============================

        if os.path.exists(
            "reports.json"
        ):

            with open(
                "reports.json",
                "r"
            ) as file:

                reports = json.load(file)

        else:

            reports = []


        # ==============================
        # ADD NEW REPORT
        # ==============================

        reports.append(report)


        # ==============================
        # SAVE REPORTS
        # ==============================

        with open(
            "reports.json",
            "w"
        ) as file:

            json.dump(
                reports,
                file,
                indent=4
            )


        return jsonify({

            "success": True,

            "message":
                "Report submitted successfully",

            "report":
                report

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# ==============================
# GET ALL REPORTS
# ==============================

@app.route("/reports", methods=["GET"])
def get_reports():

    try:

        if os.path.exists(
            "reports.json"
        ):

            with open(
                "reports.json",
                "r"
            ) as file:

                reports = json.load(file)

        else:

            reports = []


        return jsonify(reports)


    except Exception as e:

        return jsonify({

            "error":
                str(e)

        }), 500


# ==============================
# UPDATE REPORT STATUS
# ==============================

@app.route("/update-status", methods=["POST"])
def update_status():

    try:

        data = request.get_json()

        report_id = data.get(
            "report_id"
        )

        new_status = data.get(
            "status"
        )


        # Check required data
        if not report_id or not new_status:

            return jsonify({

                "success": False,

                "error":
                    "Report ID and status are required"

            }), 400


        # Allowed statuses
        allowed_statuses = [

            "Submitted",

            "In Progress",

            "Resolved"

        ]


        if new_status not in allowed_statuses:

            return jsonify({

                "success": False,

                "error":
                    "Invalid status"

            }), 400


        # ==============================
        # READ REPORTS
        # ==============================

        if os.path.exists(
            "reports.json"
        ):

            with open(
                "reports.json",
                "r"
            ) as file:

                reports = json.load(file)

        else:

            reports = []


        # ==============================
        # FIND REPORT
        # ==============================

        report_found = False


        for report in reports:

            if report.get(
                "report_id"
            ) == report_id:

                report["status"] = new_status

                report_found = True

                break


        # Report not found
        if not report_found:

            return jsonify({

                "success": False,

                "error":
                    "Report not found"

            }), 404


        # ==============================
        # SAVE UPDATED REPORTS
        # ==============================

        with open(
            "reports.json",
            "w"
        ) as file:

            json.dump(
                reports,
                file,
                indent=4
            )


        return jsonify({

            "success": True,

            "message":
                "Status updated successfully"

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# ==============================
# START SERVER
# ==============================

if __name__ == "__main__":

    app.run(

        debug=True,

        host="127.0.0.1",

        port=5000

    )