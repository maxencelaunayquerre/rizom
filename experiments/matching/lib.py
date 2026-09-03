from dataclasses import dataclass

COMMON_LANGUAGES_REQUIREMENT = 1
COMMON_INTERESTS_REQUIREMENT = 1

# @dataclass(frozen=True, slots=True) # slots only avaible in 3.10
@dataclass(frozen=True)
class User:
    _id: int
    interests: list[int]
    languages: list[int]
    gender: int

    def get_csv_format(self):
        return [self._id, self.interests, self.languages, self.gender]

def get_matching_score(user_A: User, user_B: User) -> bool:
    """
    To know whether or not 2 users can be put together
    """
    # Check if they speak the same language
    if len(set(user_A.languages).intersection(set(user_B.languages))) < COMMON_LANGUAGES_REQUIREMENT:
        return False
    # Check if they have at least X interests in common
    if len(set(user_A.interests).intersection(set(user_B.interests))) < COMMON_INTERESTS_REQUIREMENT:
        return False
    return True

def get_matching_scores(user_A: User, user_B: User) -> tuple[int, int]:
    """
    Know how similar 2 users are
    """
    # Check if they speak the same language
    match_languages = len(set(user_A.languages).intersection(set(user_B.languages)))
    match_interests = len(set(user_A.interests).intersection(set(user_B.interests)))
    return match_interests, match_languages