import os
import boto3
from botocore.config import Config

R2_ACCOUNT_ID = os.environ["R2_ACCOUNT_ID"]
R2_ACCESS_KEY_ID = os.environ["R2_ACCESS_KEY_ID"]
R2_SECRET_ACCESS_KEY = os.environ["R2_SECRET_ACCESS_KEY"]
R2_BUCKET_NAME = os.environ["R2_BUCKET_NAME"]
R2_PUBLIC_URL = os.environ["R2_PUBLIC_URL"].rstrip("/")

_endpoint_url = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

_client = boto3.client(
    "s3",
    endpoint_url=_endpoint_url,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4"),
    region_name="auto",
)


def generate_upload_url(key: str, content_type: str, expires_in: int = 600) -> str:
    return _client.generate_presigned_url(
        "put_object",
        Params={"Bucket": R2_BUCKET_NAME, "Key": key, "ContentType": content_type},
        ExpiresIn=expires_in,
    )


def public_url(key: str) -> str:
    return f"{R2_PUBLIC_URL}/{key}"
