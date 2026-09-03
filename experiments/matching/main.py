import time, sys
import chromadb
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings

from generate_mock_data import User, generate_data_into
from lib import get_matching_scores

chroma_client = chromadb.Client()

class UselessEmbeddingFunction(EmbeddingFunction):
    def __call__(self, texts: Documents) -> Embeddings:
        # embed the documents somehow
        return [1]

collection = chroma_client.create_collection(name="users", embedding_function=UselessEmbeddingFunction)

NUMBER_OF_USERS = 500 # 50000
NUMBER_OF_MATCHES = 30 # 1000

def generate_users():
    print("Generating the users...")
    # Get some users

    return generate_data_into(NUMBER_OF_USERS)

def add_users_to_collection(generated_users):
    # Add them to the database

    progress_bar_width = 20

    last_updated = 0
    computed_users = 0

    # sys.stdout.flush()

    # sys.stdout.write("Adding the users to the collection : [%s]" % (" " * progress_bar_width))
    # sys.stdout.flush()
    # sys.stdout.write("\b" * (progress_bar_width+1)) # return to start of line, after '['

    t1 = time.time()
    vecs = [user.get_vector_format() for user in generated_users]
    t2 = time.time()

    t3 = time.time()
    metadatas = [{
        "user_id": user._id,
        "nb_languages": len(user.languages),
        "gender": user.gender
    } for user in generated_users]
    t4 = time.time()

    t5 = time.time()
    ids = [str(user._id) for user in generated_users]
    t6 = time.time()

    t7 = time.time()
    collection.add(
        embeddings=vecs,
        metadatas=metadatas,
        ids =ids
    )
    t8 = time.time()

    print(f"Vecs in {t2 - t1}s, metadatas in {t4 - t3}s, ids in {t6 - t5}s and adding to the collection in {t8 - t7}s.")

    # for user in generated_users: # Obviously a loop is not efficient, but that's not the point here to be efficient
    #     vec = user.get_vector_format()
    #     collection.add(
    #         embeddings=[vec],
    #         metadatas=[],
    #         ids = [str(user._id)]
    #     )
    #     computed_users += 1
    #     if (computed_users - last_updated) > (len(generated_users) // progress_bar_width):
    #         sys.stdout.write("-")
    #         sys.stdout.flush()
    #         last_updated = computed_users
    # sys.stdout.write("-\n")
    # sys.stdout.flush()
    

def do_some_query():
    print("Testing the queries")
    # Generate a new user

    new_user = generate_data_into(1)[0]

    # Find matches
    t1 = time.time()
    matches = collection.query(
        query_embeddings = [new_user.get_vector_format()],
        n_results = NUMBER_OF_MATCHES,
        include=["embeddings", "metadatas", "distances"]
    )
    t2 = time.time()

    # print(matches)

    # print(*matches["embeddings"][0], sep="\n")

    print("Query user :", new_user)

    # print(*[len(matches["embeddings"][0][idx]) for idx in range(NUMBER_OF_MATCHES)])

    total_lang_matching = 0
    total_inter_matching = 0

    print("Matches")
    matches_user = [User.from_vector_format(matches["ids"][0][idx], matches["metadatas"][0][idx]["gender"], matches["embeddings"][0][idx]) for idx in range(NUMBER_OF_MATCHES)]
    for user in matches_user:
        interests, languages = get_matching_scores(new_user, user)
        total_lang_matching += languages
        total_inter_matching += interests
        # print(f"Languages in common : {languages}, interests in common : {interests}")
    print(f"Languages in common (avg) : {round(total_lang_matching/NUMBER_OF_MATCHES, 2)}, interests in common (avg) : {round(total_inter_matching/NUMBER_OF_MATCHES, 2)}")
    print(f"Query in {t2 - t1}s")


users = generate_users()
add_users_to_collection(users)
do_some_query()

# print(f"Total time : {t3 - t0}s | Query time : {t2 - t1}s.")

"""
What is really obvious is that adding the users to the database is way more ressource-intensive than querying.
The performances here are really encouraging the query of 1K with 50K users (10 among 200 avaible interests and 2-4 among 10 avaible languages) is done in 0.15s. That is on my PC, it may take a lot more time on a less powerful CPU as the one on the server. That being said, we probably won't ever reach that many users and such queries, so we shouldn't worry too much. Adopting this database for the whole app seems ambitious, maybe a bit too much. I think we can continue to use SQLite for the messaging part and use the same IDs in ChromaDB when it comes to the matching algorithm. This is the most convenient and the most easy to set up (but maybe not the most efficient in both memory and CPU).

When it comes to the quality of the query, with the query described earlier, we have a 1.84 common language in average and 2.11 common interests in average. This is quite enough I guess.

Add a part of random?

what worries me is the size of ChromaDB, I think it needs Pytorch and stuff, some few hundred MB, this is quite something really.
"""