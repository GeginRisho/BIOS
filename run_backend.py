import subprocess
import time
import httpx
import os
import sys
import asyncio

SERVICES = [
    {"name": "auth_service", "port": 8001},
    {"name": "business_service", "port": 8002},
    {"name": "kg_service", "port": 8003},
    {"name": "twin_service", "port": 8004},
    {"name": "crawler_service", "port": 8005},
    {"name": "prediction_service", "port": 8007},
    {"name": "simulation_service", "port": 8008},
    {"name": "agent_service", "port": 8009},
    {"name": "search_service", "port": 8010},
    {"name": "notification_service", "port": 8011},
    {"name": "report_service", "port": 8012},
]

def kill_processes_on_ports():
    if os.name != "nt":
        return
    print("Checking and cleaning up stale processes on service ports...")
    ports = [svc["port"] for svc in SERVICES]
    try:
        # Run netstat to find all active listening ports and their PIDs
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True,
            text=True
        )
        pids_to_kill = set()
        for line in result.stdout.splitlines():
            # Look for listening sockets
            if "LISTENING" in line:
                parts = line.strip().split()
                if len(parts) >= 5:
                    local_address = parts[1]
                    try:
                        port_str = local_address.rsplit(":", 1)[-1]
                        if port_str.isdigit():
                            port_val = int(port_str)
                            if port_val in ports:
                                pid = parts[-1]
                                if pid.isdigit() and pid != "0":
                                    pids_to_kill.add((port_val, pid))
                    except Exception:
                        pass
                                
        for port, pid in pids_to_kill:
            print(f"Port {port} is held by process PID {pid}. Terminating process tree...")
            subprocess.run(["taskkill", "/F", "/T", "/PID", pid], capture_output=True)
    except Exception as e:
        print(f"Error during port cleanup: {str(e)}")

def main():
    print("==========================================")
    print("BOOTING BIOS ENTERPRISE MICROSERVICES VIA PYTHON...")
    print("==========================================")

    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)

    # Clean up stale processes before launching
    kill_processes_on_ports()

    processes = {}
    python_exe = sys.executable

    # Set up environment variables
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"

    for svc in SERVICES:
        name = svc["name"]
        port = svc["port"]
        
        log_out_path = f"logs/{name}.log"
        log_err_path = f"logs/{name}.err"
        
        print(f"Starting {name} on port {port}...")
        
        stdout_file = open(log_out_path, "w")
        stderr_file = open(log_err_path, "w")
        
        cmd = [
            python_exe,
            "-m",
            "uvicorn",
            f"backend.services.{name}.main:app",
            "--port",
            str(port),
            "--host",
            "127.0.0.1"
        ]
        
        proc = subprocess.Popen(
            cmd,
            stdout=stdout_file,
            stderr=stderr_file,
            env=env,
            cwd=os.getcwd()
        )
        processes[name] = (proc, stdout_file, stderr_file)

    print("------------------------------------------")
    print("Waiting 5 seconds for microservices to initialize...")
    time.sleep(5)

    print("\n==========================================")
    print("VERIFYING SERVICES HEALTH...")
    print("==========================================")

    all_healthy = True
    with httpx.Client() as client:
        for svc in SERVICES:
            name = svc["name"]
            port = svc["port"]
            url = f"http://127.0.0.1:{port}/health"
            try:
                resp = client.get(url, timeout=5.0)
                if resp.status_code == 200:
                    print(f"[ONLINE] {name} (Port {port}) -> Status: Healthy")
                else:
                    print(f"[OFFLINE] {name} (Port {port}) -> Status Code: {resp.status_code}")
                    all_healthy = False
            except Exception as e:
                print(f"[OFFLINE] {name} (Port {port}) -> Failed to reach: {str(e)}")
                all_healthy = False

    print("==========================================")
    if all_healthy:
        print("SUCCESS: All 11 microservices are healthy!")
        
        # Now run the integration tests!
        print("\n==========================================")
        print("RUNNING INTEGRATION VERIFICATIONS...")
        print("==========================================")
        
        try:
            # Run test_api_operations.py using the venv python
            res = subprocess.run([python_exe, "test_api_operations.py"], capture_output=False)
            if res.returncode == 0:
                print("\nIntegration tests PASSED successfully!")
            else:
                print(f"\nIntegration tests FAILED with exit code: {res.returncode}")
        except Exception as e:
            print(f"Error running integration tests: {str(e)}")
    else:
        print("WARNING: Some microservices are offline. Skipping integration tests.")

    print("\nEntering persistent loop. Services are running in the background.")
    print("Press Ctrl+C to terminate all backend.services.")
    
    try:
        while True:
            # Check if any service process has exited unexpectedly
            for name, (proc, _, _) in processes.items():
                ret = proc.poll()
                if ret is not None:
                    print(f"WARNING: Service {name} has terminated with exit code {ret}")
            time.sleep(10)
    except KeyboardInterrupt:
        print("\nTerminating all backend.services...")
    finally:
        for name, (proc, stdout_file, stderr_file) in processes.items():
            print(f"Stopping {name} (PID {proc.pid})...")
            if os.name == "nt":
                try:
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
                except Exception as e:
                    print(f"Failed to kill process tree for {name}: {str(e)}")
            else:
                proc.terminate()
                try:
                    proc.wait(timeout=3.0)
                except subprocess.TimeoutExpired:
                    proc.kill()
            stdout_file.close()
            stderr_file.close()
        print("All services stopped.")

if __name__ == "__main__":
    main()
