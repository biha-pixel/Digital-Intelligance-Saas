import subprocess
import os
import sys

def run_git(args, input_data=None):
    res = subprocess.run(['git'] + args, input=input_data, capture_output=True, text=True, encoding='utf-8')
    if res.returncode != 0:
        print(f"Git error on {' '.join(args)}:\n{res.stderr}", file=sys.stderr)
        sys.exit(res.returncode)
    return res.stdout.strip()

def main():
    print("Rewriting commit history to remove Claude co-author trailers...")
    commits_str = run_git(['rev-list', '--reverse', '--parents', 'HEAD'])

    commit_map = {}

    for line in commits_str.splitlines():
        parts = line.split()
        old_sha = parts[0]
        parents = parts[1:]

        new_parents = [commit_map[p] for p in parents if p in commit_map]

        tree_sha = run_git(['rev-parse', f'{old_sha}^{{tree}}'])
        author_name = run_git(['log', '-1', '--format=%an', old_sha])
        author_email = run_git(['log', '-1', '--format=%ae', old_sha])
        author_date_raw = run_git(['log', '-1', '--format=%at %ai', old_sha])

        committer_name = run_git(['log', '-1', '--format=%cn', old_sha])
        committer_email = run_git(['log', '-1', '--format=%ce', old_sha])
        committer_date_raw = run_git(['log', '-1', '--format=%ct %ci', old_sha])

        subject = run_git(['log', '-1', '--format=%s', old_sha])
        body = run_git(['log', '-1', '--format=%b', old_sha])

        if body:
            body_lines = [l for l in body.splitlines() if 'claude' not in l.lower()]
            body = '\n'.join(body_lines).strip()

        full_msg = subject
        if body:
            full_msg += f"\n\n{body}"

        env = os.environ.copy()
        env['GIT_AUTHOR_NAME'] = author_name
        env['GIT_AUTHOR_EMAIL'] = author_email
        env['GIT_AUTHOR_DATE'] = author_date_raw
        env['GIT_COMMITTER_NAME'] = committer_name
        env['GIT_COMMITTER_EMAIL'] = committer_email
        env['GIT_COMMITTER_DATE'] = committer_date_raw

        cmd = ['commit-tree', tree_sha, '-m', full_msg]
        for p in new_parents:
            cmd.extend(['-p', p])

        res = subprocess.run(['git'] + cmd, input=full_msg, env=env, capture_output=True, text=True, encoding='utf-8')
        if res.returncode != 0:
            print(f"Failed to create commit for {old_sha}:\n{res.stderr}", file=sys.stderr)
            sys.exit(1)

        new_sha = res.stdout.strip()
        commit_map[old_sha] = new_sha

    current_branch = run_git(['branch', '--show-current'])
    if current_branch:
        new_head = commit_map[run_git(['rev-parse', 'HEAD'])]
        run_git(['update-ref', f'refs/heads/{current_branch}', new_head])
        print(f"Updated branch '{current_branch}' to {new_head[:7]}")

    print("History cleaned of Claude co-authorship.")

if __name__ == '__main__':
    main()
