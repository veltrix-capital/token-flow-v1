Tasks

1. Token Flow Pathways
	- Who received tokens from whom?
	- How do tokens flow from reward to redeem?
	- trace token paths across transfer (e.g. Business -> Alice -> Bob -> redeem)

2. Most Active Users
	- count outgoing / incoming edges for each wallet
	- Rank top participants:
		* who receives the most reward
		* who redeems the most
		* who frequentely transfer tokens

3. Redemption Behavior Mapping
	- What type of users redeem tokens directly?
	- Do they transfer tokens before redeeming?
	- Do users cluster around specific redeem contracts?

4. Influence Analysis
	- Use algorithms like PageRank or Centrality to find:
		* key users in token circulation
		* influential wallets (maybe business or aggregators)

5. Anomalous Behavior Detection
	- cycles -> potential abuse loops (self-transfer to inflate points)
	- Token laundering -> reward that bounce throuh many wallets
	- Orphaned tokens -> rewards never redeemed

6. Flow Bottlenecks
	 identity
			- Redemption contracts with high inbound flow but low output
			- Busineses whose tokens never circulate
			- Users who break the token flow (holders who never redeem)

7. Business-Centric Analytics
	- For given business
			how do tokens flow out to the network?
			what percentage gets redeemed or swapped?
			How much flows back to the same business?