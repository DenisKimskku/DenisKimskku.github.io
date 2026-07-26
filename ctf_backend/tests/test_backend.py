from app.core.security import generate_flag, verify_flag
from app.core.challenges import get_challenge, CHALLENGES

def test_dynamic_flag_generation():
    user_id = "user_12345"
    level_id = 1
    seed = "test_seed_987"
    
    flag1 = generate_flag(user_id, level_id, seed)
    assert flag1.startswith("CTF{")
    assert flag1.endswith("}")
    
    # Verification matching
    assert verify_flag(flag1, user_id, level_id, seed) is True
    
    # Different user must yield different flag
    flag2 = generate_flag("user_99999", level_id, seed)
    assert flag1 != flag2
    assert verify_flag(flag1, "user_99999", level_id, seed) is False

def test_all_20_challenges_exist():
    assert len(CHALLENGES) == 20
    for i in range(1, 21):
        ch = get_challenge(i)
        assert ch is not None
        assert ch["level"] == i
        assert "title" in ch
        assert "system_prompt" in ch
