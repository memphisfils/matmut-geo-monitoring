import os
import json
import urllib.request
from datetime import datetime

def send_slack_alert(message: str):
    """
    Envoie une alerte sur Slack via Webhook.
    Utilise urllib pour éviter une dépendance supplémentaire à 'requests'.
    """
    webhook_url = os.environ.get('SLACK_WEBHOOK_URL')
    
    if not webhook_url:
        print(f"[ALERT MOCKED] Slack Webhook not configured. Alert: {message}")
        return False
        
    payload = {
        "text": f"🚨 *Alerte Matmut GEO Dashboard* - {datetime.now().strftime('%H:%M')}\n\n{message}"
    }
    
    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print(f"[ALERT SENT] Slack alert sent successfully.")
                return True
            else:
                print(f"[ALERT FAILED] Slack returned status {response.status}")
                return False
                
    except Exception as e:
        print(f"[ALERT ERROR] Failed to send Slack alert: {e}")
        return False
