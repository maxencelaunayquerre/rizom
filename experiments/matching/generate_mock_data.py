"""
This file is used to simulate real data from users.
Its role is only to generate the mock data and to put it in a CSV file.
"""
import random
from dataclasses import dataclass
import csv

from lib import get_matching_score

possible_choices = {
    "interests": 200,
    "languages": 10, # Maybe choose between 1 and 4
    "gender": 2 # That may not be useful
}

# @dataclass(frozen=True, slots=True) # slots only avaible in 3.10
@dataclass(frozen=True)
class User:
    _id: int
    interests: list[int]
    languages: list[int]
    gender: int

    def get_csv_format(self):
        return [self._id, self.interests, self.languages, self.gender]
    
    def get_vector_format(self):
        """
        Return the user as a vector
        """
        interests = [1 if idx in self.interests else 0 for idx in range(possible_choices["interests"])]
        languages = [1 if idx in self.languages else 0 for idx in range(possible_choices["languages"])]
        return interests + languages
    
    @classmethod
    def from_vector_format(cls, userid, gender, vector, nb_languages=possible_choices["languages"]):
        interests_vec = vector[:possible_choices["interests"]]
        languages_vec = vector[possible_choices["interests"]:possible_choices["interests"]+nb_languages]
        interests = []
        for idx, interest in enumerate(interests_vec):
            if interest == 1:
                interests.append(idx)
        languages = []
        for idx, language in enumerate(languages_vec):
            if language == 1:
                languages.append(idx)
        return cls(userid, interests, languages, gender)


"""
interests languages gender required_languages required_interests
100 5 2 1 2 -> 1% de matchs
50 5 2 1 2 -> 3% de matchs
25 5 2 1 2 -> 10% de matchs
100 5 2 1 1 -> 12% de matchs
50 5 2 1 1 -> 20% de matchs
"""


def generate_data_into(number_of_profiles) -> list[User]:
    """
    """
    users = []
    for user_id in range(number_of_profiles):
        interests = random.sample(range(possible_choices["interests"]), 10)
        languages = random.sample(range(possible_choices["languages"]), random.randint(2, 4))
        gender = random.randint(1, possible_choices["gender"])
        users.append(User(user_id, interests, languages, gender))
    return users

def write_data(data_store, file_name):
    with open(file_name, 'w', newline='') as csvfile:
        fieldnames = ['_id', 'interests', 'languages', 'gender']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for user in data_store:
            writer.writerow(dict(zip(fieldnames, user.get_csv_format())))



# Test to see if people are overall compatible or not

def get_average_compatibility(data):
    count = 0
    total = 0
    for idx, user_A in enumerate(data):
        for user_B in data[idx:]:
            if user_A == user_B: continue
            if get_matching_score(user_A, user_B):
                count += 1
            total += 1
    print(round(count/total, 3))



def main():
    data = generate_data_into(3)
    print(data)

    for user in data:
        vec = user.get_vector_format()
        print(vec)
        print(user, User.from_vector_format(user._id, user.gender, vec))

    # write_data(data, "mock-data.csv")
    # get_average_compatibility(data)

if __name__ ==  "__main__":
    main()