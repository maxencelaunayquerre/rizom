import hashlib

def get_sha256_hash(data: str) -> str:
    hashed = hashlib.sha256(data.encode("utf-8")).hexdigest()
    return hashed

def ascii_array_to_unicode_array(array: list[int]) -> list[int]:
    final_array = [0] * (len(array) // 2)
    for idx in range(len(final_array)):
        final_array[idx] = array[2*idx+1] * 256 + array[2*idx]
    return final_array

def unicode_array_to_ascii_array(array: list[int]) -> list[int]:
    final_array = [0] * (len(array) * 2)
    for idx in range(len(array)):
        final_array[2*idx+1] = array[idx] // 256
        final_array[2*idx] = array[idx] % 256
    return final_array