# k8s-docker-playground

A small Node.js API, packaged as a Docker image and run on a local Kubernetes cluster.

The app listens on port 3000.

- `GET /` returns `{"message":"Hello from Docker!","version":"2.0.0"}`
- `GET /health` returns `{"status":"success"}`

## What you need

- Docker CLI
- [Colima](https://github.com/abiosoft/colima) (runs Docker and Kubernetes on macOS)
- kubectl

```bash
brew install docker colima
brew install kubectl
```

## 1. Start Kubernetes

```bash
colima start --kubernetes
kubectl get nodes
```

`kubectl get nodes` should show one node named `colima` in the `Ready` state.

Colima is the Linux VM. Kubernetes (k3s) runs inside it. Docker Desktop is not required.

## 2. Build the image

From this directory:

```bash
docker build -t saurabhj25/k8s-docker-playground:2.0 .
```


| Piece                                     | Meaning                                          |
| ----------------------------------------- | ------------------------------------------------ |
| `docker build`                            | Build an image from the `Dockerfile`             |
| `-t saurabhj25/k8s-docker-playground:2.0` | Name and tag. This matches `image` in `k8s.yaml` |
| `.`                                       | Use the current directory as the build context   |


To run that image with Docker only, before Kubernetes:

```bash
docker run --name playground -p 3000:3000 saurabhj25/k8s-docker-playground:2.0
```

Open `http://localhost:3000`. Stop it with `Ctrl+C`, then `docker rm playground` if you want the name free for the next run.

`-p 8080:3000` publishes a different port on your Mac. The process inside the container still listens on 3000.

## 3. Give the image to the cluster

Kubernetes inside Colima does not see images from `docker build` until you load or push them.

Load it into the local cluster:

```bash
docker save saurabhj25/k8s-docker-playground:2.0 | colima ssh -- sudo k3s ctr images import -
```

Or push it and let the cluster pull it:

```bash
docker login
docker push saurabhj25/k8s-docker-playground:2.0
```



## 4. Deploy

`k8s.yaml` holds the Deployment, the autoscaler, and the Service, separated by `---`.

```bash
kubectl apply -f k8s.yaml
kubectl get deployment,hpa,service,pods
```

You should see:

- Deployment `demo-api-deployment` with 2 replicas
- HorizontalPodAutoscaler `demo-api` with min 2 and max 5
- Service `demo-api-service` of type `NodePort`
- 2 Pods whose names start with `demo-api-deployment-`

`replicas: 2` is the starting count, and it matches `minReplicas`. The autoscaler owns that count afterward and can raise it up to 5 when average CPU use stays above 70%. The container `requests.cpu` is what that percentage is measured against.

`metadata.name: demo-api-deployment` is the Deployment object's name. `app: demo-api` is the label on its Pods. The Service selects Pods with that label. It does not look up the Deployment by name.

Apply `k8s.yaml` on its own. `pod.yaml` creates another Pod with the same `app: demo-api` label, and the Service would send traffic to that Pod as well.

## 5. Call the API

Port-forward maps the Service to your Mac:

```bash
kubectl port-forward svc/demo-api-service 3000:3000
```

In another terminal:

```bash
curl http://localhost:3000
curl http://localhost:3000/health
```

`kubectl get svc demo-api-service` also shows a NodePort (a port in the 30000–32767 range). On Colima that port is on the VM, so port-forward is the direct way to open the app on localhost.

## 6. Inspect

```bash
kubectl get pods
kubectl get hpa demo-api
kubectl logs -l app=demo-api
kubectl describe deployment demo-api-deployment
```

`kubectl get hpa` shows the current replica count and CPU. A target of `<unknown>` means this cluster has no metrics-server yet, so the Deployment stays at 2 Pods until metrics are available.

`docker ps` lists Docker containers. `kubectl get pods` lists Kubernetes Pods. After step 4, the API is running as Pods.

## Files


| File              | Purpose                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| `Dockerfile`      | Builds the image: Node 22 on Alpine, copies the app, runs `npm start`                |
| `src/server.js`   | HTTP server                                                                          |
| `k8s.yaml`        | Deployment (starts at 2 Pods), autoscaler (2–5), and Service on port 3000. Apply it. |
| `deployment.yaml` | Deployment only, starting at 2 replicas. Ignore it.                                  |
| `service.yaml`    | Same Service, in its own file. Ignore it.                                            |
| `pod.yaml`        | One Pod with no replica count and no restart controller. Ignore it.                  |




## Clean up

```bash
kubectl delete -f k8s.yaml
colima stop
```

